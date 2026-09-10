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
  /** O AniList está fora e o banco tinha o que mostrar (#165). */
  | { estado: "cache"; termo: string; obras: MediaDoAniList[]; temMais: boolean }
  /** O AniList está fora e o Kitsu respondeu no lugar dele (#219). */
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
  /** O tapa-buraco enquanto o AniList está fora (#219). Nunca com ele de pé. */
  noKitsu: (termo: string, pagina: number) => Promise<PaginaDaFonte>;
};

/**
 * O que uma fonte paginada devolve. `temMais` é resposta DELA, não contagem do
 * que sobrou: o Kitsu entrega obras que o nosso domínio descarta (`oneshot`,
 * `oel`, obra sem mapeamento para o AniList), então uma página curta não
 * significa acervo no fim — significa que descartamos bastante (#228).
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
  anilistId: number;
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

export function obraParaDTO(obra: MediaDoAniList, naEstante: ReadonlySet<number>): ObraDoCatalogoDTO
{
  return {
    anilistId: obra.anilistId,
    titulo: obra.titleEnglish ?? obra.titleRomaji,
    capa: obra.coverImageUrl ?? null,
    tipo: obra.type,
    pais: obra.countryOfOrigin ?? null,
    capitulos: obra.chapters ?? null,
    descricao: obra.description ?? null,
    jaNaEstante: naEstante.has(obra.anilistId),
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

export const DEPS_DE_PRODUCAO: DependenciasDoCatalogo = {
  populares: function (pagina)
  {
    return pagina === 1 ? primeiraPaginaDaVitrine() : buscarPopulares(OBRAS_POR_PAGINA, pagina);
  },
  filtrado: function (filtro, pagina) { return buscarFiltrado(filtro, OBRAS_POR_PAGINA, pagina); },
  limitar: function (ip) { return limitarBuscaDoCatalogo({ ip }); },
  doCache: buscarMediasEmCache,
  noKitsu: buscarNoKitsu,
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
  try
  {
    if (filtro.termo === "" && !temFiltroAtivo(filtro))
    {
      const obras = await deps.populares(pagina);

      return obras.length === 0
        ? { estado: "vazio", termo: "" }
        : { estado: "destaques", termo: "", obras, temMais: paginaCheia(obras) };
    }

    // Só a busca filtrada tem teto, e só quando quem chama sabe o IP. A vitrine
    // fica de fora porque é lembrada: repetir não custa ida ao AniList.
    if (ip !== undefined)
    {
      const limite = await deps.limitar(ip);

      if (limite.bloqueado)
      {
        return { estado: "muitos_pedidos", termo: filtro.termo };
      }
    }

    const obras = await deps.filtrado(filtro, pagina);

    return obras.length === 0
      ? { estado: "vazio", termo: filtro.termo }
      : { estado: "ok", termo: filtro.termo, obras, temMais: paginaCheia(obras) };
  }
  catch
  {
    // O motivo fica no log da plataforma. A tela não mostra texto de erro de
    // terceiro, que pode conter URL interna ou detalhe de infraestrutura.
    //
    // Antes de desistir, o banco (#165): o resto do sistema já degrada com o
    // cache, e o catálogo era o único caminho que o ignorava de propósito — a
    // decisão fazia sentido quando o risco era o Postgres cair, e inverteu de
    // efeito quando quem caiu foi o terceiro. Cache-first NÃO: só no fallback,
    // senão a busca vira um índice das poucas obras que alguém já abriu.
    return await semOAniList(filtro, deps, pagina);
  }
}

/**
 * A escada de quando o AniList falha (#219).
 *
 * 1. **Kitsu**, que tem catálogo de verdade e entrega o `anilistId` junto — o
 *    que a pessoa achar aqui é a mesma linha que o AniList vai atualizar depois.
 * 2. **Cache local**, que só tem o que alguém já visitou.
 * 3. **Indisponível**, a verdade quando não há nada a mostrar.
 *
 * Nesta ordem porque o Kitsu cobre o acervo e o cache cobre um punhado de obras.
 * E nada disso roda com o AniList de pé: é fallback, não segunda fonte ao vivo.
 */
async function semOAniList(
  filtro: FiltroDoCatalogo,
  deps: DependenciasDoCatalogo,
  pagina: number,
): Promise<ResultadoBusca>
{
  try
  {
    const daFonte = await deps.noKitsu(filtro.termo, pagina);

    if (daFonte.obras.length > 0)
    {
      return { estado: "kitsu", termo: filtro.termo, obras: daFonte.obras, temMais: daFonte.temMais };
    }
  }
  catch
  {
    // O tapa-buraco também caiu. Segue para o cache.
  }

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
