import { chaveDaObra } from "@/server/domain/referencia-da-obra";
import { referenciaDaObra } from "@/server/domain/anilist-media";
/**
 * Busca no catalogo. Nao toca banco: e o que faz `/catalogo` mostrar algo real
 * mesmo com o Postgres fora.
 *
 * O cache em `Media` entra na tarefa da estante, que ja precisa da linha para o
 * `ShelfEntry.mediaId` — ver o desvio registrado em
 * `Obsidian/02. Implementacoes/slice-vertical/CLAUDE.md`.
 */
import { buscarFiltrado, buscarPopulares } from "@/server/infra/anilist";
import { buscarMediasEmCache } from "@/server/repositories/media.repository";
import { buscarNoKitsu } from "@/server/infra/kitsu";
import { lembrarPorTempo } from "@/server/domain/memoria-curta";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import { limitarBuscaDoCatalogo } from "./limite.service";
import type { MediaDoAniList, PaisDeOrigem } from "@/server/domain/anilist-media";
import {
  temFiltroAtivo,
  type FiltroDoCatalogo,
} from "@/server/domain/catalogo-filtros";

export type ResultadoBusca =
  | { estado: "ok"; termo: string; obras: MediaDoAniList[]; temMais: boolean }
  | { estado: "destaques"; termo: ""; obras: MediaDoAniList[]; temMais: boolean }
  | { estado: "vazio"; termo: string }
  | { estado: "indisponivel"; termo: string }
  | { estado: "muitos_pedidos"; termo: string }
  /** As duas fontes falharam e o banco tinha o que mostrar. */
  | { estado: "cache"; termo: string; obras: MediaDoAniList[]; temMais: boolean }
  /** Resposta da fonte principal, o Kitsu. */
  | { estado: "kitsu"; termo: string; obras: MediaDoAniList[]; temMais: boolean };

/**
 * Nunca levanta. A tela é pública e o AniList é de terceiro: fora do ar, a
 * página informa e continua de pé em vez de virar erro 500.
 *
 * Sem termo E sem filtro, a resposta são os populares (`destaques`) — o
 * catálogo abre com vitrine. Termo ou filtro ativo viram busca filtrada.
 */
export type DependenciasDoCatalogo = {
  populares: (pagina: number) => Promise<MediaDoAniList[]>;
  filtrado: (filtro: FiltroDoCatalogo, pagina: number) => Promise<MediaDoAniList[]>;
  limitar: (ip: string) => Promise<Veredito>;
  /** As obras já cacheadas que casam com o termo. Só entra no fallback (#165). */
  doCache: (termo: string, pagina: number) => Promise<MediaDoAniList[]>;
  /** Fonte principal para vitrine, filtros e paginação. */
  noKitsu: (filtro: FiltroDoCatalogo, pagina: number) => Promise<PaginaDaFonte>;
};

/**
 * `temMais` vem da fonte: registros inválidos podem ser descartados pelo
 * domínio, então uma página curta não significa necessariamente o fim.
 */
export type PaginaDaFonte = {
  obras: MediaDoAniList[];
  temMais: boolean;
};

/**
 * Uma página do catálogo: 36 obras, quatro andares de nove na prateleira. A
 * home mostra a primeira; o catálogo pede as seguintes sob demanda.
 */
export const OBRAS_POR_PAGINA = 36;

/**
 * O contrato do card do catálogo, para a tela e para a API — só o que o card
 * precisa, nunca a obra inteira. Vive aqui porque a tela não importa da camada
 * de controller (o `boundaries` cobra), e as duas precisam da mesma forma.
 */
export type ObraDoCatalogoDTO = {
  /** A obra pela chave (#254): `anilist:30002`, `kitsu:54598`. */
  chave: string;
  titulo: string;
  capa: string | null;
  tipo: "MANGA" | "NOVEL";
  pais: PaisDeOrigem | null;
  capitulos: number | null;
  descricao: string | null;
  jaNaEstante: boolean;
};

export type PaginaDoCatalogoDTO = {
  estado: ResultadoBusca["estado"];
  obras: ObraDoCatalogoDTO[];
  /** Veio uma página cheia: vale a pena oferecer a próxima. */
  temMais: boolean;
};

export function obraParaDTO(obra: MediaDoAniList, naEstante: ReadonlySet<string>): ObraDoCatalogoDTO
{
  const chave = chaveDaObra(referenciaDaObra(obra));

  return {
    chave,
    titulo: obra.titleEnglish ?? obra.titleRomaji,
    capa: obra.coverImageUrl ?? null,
    tipo: obra.type,
    pais: obra.countryOfOrigin ?? null,
    capitulos: obra.chapters ?? null,
    descricao: obra.description ?? null,
    jaNaEstante: naEstante.has(chave),
  };
}

/**
 * A vitrine é a MESMA para todo visitante, então a resposta serve a janela
 * inteira (#134). Sem isso, `GET /` — que é `force-dynamic` — virava uma
 * requisição real ao AniList em todo render, saindo do IP único do deploy:
 * algumas dezenas por minuto estouravam a cota e derrubavam catálogo, autor,
 * página da obra e a adição à estante para TODO MUNDO.
 *
 * A busca filtrada fica de fora de propósito: ali a chave é o `?q=`, escolhido
 * por quem pede, e memo não defende chave que o atacante inventa. Aquele lado é
 * teto por IP, ainda não implementado.
 *
 * `lembrarPorTempo` compartilha a promessa em voo, então renders concorrentes
 * não duplicam a ida, e falha não fica lembrada.
 */
const JANELA_DA_VITRINE_MS = 30_000;

// Só a PRIMEIRA página da vitrine é lembrada: é a única idêntica para todo
// visitante, e é a que a home bate em todo render. Páginas seguintes são pedido
// de quem clicou em "ver mais".
const primeiraPaginaDaVitrine = lembrarPorTempo(
  function () { return buscarPopulares(OBRAS_POR_PAGINA, 1); },
  JANELA_DA_VITRINE_MS,
);

/**
 * A vitrine principal é lembrada: cada página pode fazer três pedidos ao Kitsu.
 */
const VITRINE_SEM_FILTRO: FiltroDoCatalogo = { termo: "", ordem: "popular" };

const primeiraPaginaDaVitrineDoKitsu = lembrarPorTempo(
  function () { return buscarNoKitsu(VITRINE_SEM_FILTRO, 1); },
  JANELA_DA_VITRINE_MS,
);

export const DEPS_DE_PRODUCAO: DependenciasDoCatalogo = {
  populares: function (pagina)
  {
    return pagina === 1 ? primeiraPaginaDaVitrine() : buscarPopulares(OBRAS_POR_PAGINA, pagina);
  },
  filtrado: function (filtro, pagina) { return buscarFiltrado(filtro, OBRAS_POR_PAGINA, pagina); },
  limitar: function (ip) { return limitarBuscaDoCatalogo({ ip }); },
  doCache: buscarMediasEmCache,
  noKitsu: function (filtro, pagina)
  {
    // Só a vitrine é lembrada: ela é a mesma para todo visitante. Busca com
    // termo OU com qualquer filtro tem chave escolhida por quem pede, e memo
    // não defende chave que o outro lado inventa (#134).
    return filtro.termo === "" && !temFiltroAtivo(filtro) && pagina === 1
      ? primeiraPaginaDaVitrineDoKitsu()
      : buscarNoKitsu(filtro, pagina);
  },
};

/**
 * Fonte que já entrega filtrado (AniList, cache local): página cheia é a única
 * pista de que ainda há mais.
 */
function paginaCheia(obras: MediaDoAniList[]): boolean
{
  return obras.length >= OBRAS_POR_PAGINA;
}

export async function buscarNoCatalogo(
  filtro: FiltroDoCatalogo,
  deps: DependenciasDoCatalogo = DEPS_DE_PRODUCAO,
  ip?: string,
  pagina = 1,
): Promise<ResultadoBusca>
{
  const vitrine = filtro.termo === "" && !temFiltroAtivo(filtro);

  // O limite vale antes de qualquer fonte. Falha aqui não abre um caminho
  // alternativo para consultar terceiros sem passar pelo controle.
  if (!vitrine && ip !== undefined)
  {
    try
    {
      const limite = await deps.limitar(ip);
      if (limite.bloqueado)
      {
        return { estado: "muitos_pedidos", termo: filtro.termo };
      }
    }
    catch
    {
      return { estado: "indisponivel", termo: filtro.termo };
    }
  }

  try
  {
    const daFonte = await deps.noKitsu(filtro, pagina);
    return daFonte.obras.length === 0 && !daFonte.temMais
      ? { estado: "vazio", termo: filtro.termo }
      : { estado: "kitsu", termo: filtro.termo, obras: daFonte.obras, temMais: daFonte.temMais };
  }
  catch
  {
    // Só falha aciona o AniList. Resultado vazio e fim da paginação são válidos.
    return semOKitsu(filtro, deps, pagina);
  }
}

/** Kitsu falhou: AniList, depois cache local, por último indisponível. */
async function semOKitsu(
  filtro: FiltroDoCatalogo,
  deps: DependenciasDoCatalogo,
  pagina: number,
): Promise<ResultadoBusca>
{
  try
  {
    if (filtro.termo === "" && !temFiltroAtivo(filtro))
    {
      const obras = await deps.populares(pagina);

      return obras.length === 0
        ? { estado: "vazio", termo: "" }
        : { estado: "destaques", termo: "", obras, temMais: paginaCheia(obras) };
    }

    const obras = await deps.filtrado(filtro, pagina);

    return obras.length === 0
      ? { estado: "vazio", termo: filtro.termo }
      : { estado: "ok", termo: filtro.termo, obras, temMais: paginaCheia(obras) };
  }
  catch
  {
    return doCacheLocal(filtro, deps, pagina);
  }
}

/** O acervo local cobre apenas obras já visitadas, por isso vem por último. */
async function doCacheLocal(
  filtro: FiltroDoCatalogo,
  deps: DependenciasDoCatalogo,
  pagina: number,
): Promise<ResultadoBusca>
{
  try
  {
    const obras = await deps.doCache(filtro.termo, pagina);

    // Banco vazio não vira tela de "cache vazio": segue sendo indisponível, que
    // é a verdade — não temos o que mostrar porque o terceiro está fora.
    return obras.length === 0
      ? { estado: "indisponivel", termo: filtro.termo }
      : { estado: "cache", termo: filtro.termo, obras, temMais: paginaCheia(obras) };
  }
  catch
  {
    // Os dois fora. A tela do terceiro indisponível continua sendo a resposta
    // honesta, e o 500 não entra em cena.
    return { estado: "indisponivel", termo: filtro.termo };
  }
}
