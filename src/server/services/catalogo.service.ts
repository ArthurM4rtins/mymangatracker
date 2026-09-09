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
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import {
  temFiltroAtivo,
  type FiltroDoCatalogo,
} from "@/server/domain/catalogo-filtros";

export type ResultadoBusca =
  | { estado: "ok"; termo: string; obras: MediaDoAniList[] }
  | { estado: "destaques"; termo: ""; obras: MediaDoAniList[] }
  | { estado: "vazio"; termo: string }
  | { estado: "indisponivel"; termo: string }
  | { estado: "muitos_pedidos"; termo: string }
  /** O AniList está fora e o banco tinha o que mostrar (#165). */
  | { estado: "cache"; termo: string; obras: MediaDoAniList[] }
  /** O AniList está fora e o Kitsu respondeu no lugar dele (#219). */
  | { estado: "kitsu"; termo: string; obras: MediaDoAniList[] };

/**
 * Nunca levanta. A tela é pública e o AniList é de terceiro: fora do ar, a
 * página informa e continua de pé em vez de virar erro 500.
 *
 * Sem termo E sem filtro, a resposta são os populares (`destaques`) — o
 * catálogo abre com vitrine. Termo ou filtro ativo viram busca filtrada.
 */
export type DependenciasDoCatalogo = {
  populares: () => Promise<MediaDoAniList[]>;
  filtrado: (filtro: FiltroDoCatalogo) => Promise<MediaDoAniList[]>;
  limitar: (ip: string) => Promise<Veredito>;
  /** As obras já cacheadas que casam com o termo. Só entra no fallback (#165). */
  doCache: (termo: string) => Promise<MediaDoAniList[]>;
  /** O tapa-buraco enquanto o AniList está fora (#219). Nunca com ele de pé. */
  noKitsu: (termo: string) => Promise<MediaDoAniList[]>;
};

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

export const DEPS_DE_PRODUCAO: DependenciasDoCatalogo = {
  populares: lembrarPorTempo(buscarPopulares, JANELA_DA_VITRINE_MS),
  filtrado: buscarFiltrado,
  limitar: function (ip) { return limitarBuscaDoCatalogo({ ip }); },
  doCache: buscarMediasEmCache,
  noKitsu: buscarNoKitsu,
};

export async function buscarNoCatalogo(
  filtro: FiltroDoCatalogo,
  deps: DependenciasDoCatalogo = DEPS_DE_PRODUCAO,
  ip?: string,
): Promise<ResultadoBusca>
{
  try
  {
    if (filtro.termo === "" && !temFiltroAtivo(filtro))
    {
      const obras = await deps.populares();

      return obras.length === 0
        ? { estado: "vazio", termo: "" }
        : { estado: "destaques", termo: "", obras };
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

    const obras = await deps.filtrado(filtro);

    return obras.length === 0
      ? { estado: "vazio", termo: filtro.termo }
      : { estado: "ok", termo: filtro.termo, obras };
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
    return await semOAniList(filtro, deps);
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
): Promise<ResultadoBusca>
{
  try
  {
    const obras = await deps.noKitsu(filtro.termo);

    if (obras.length > 0)
    {
      return { estado: "kitsu", termo: filtro.termo, obras };
    }
  }
  catch
  {
    // O tapa-buraco também caiu. Segue para o cache.
  }

  try
  {
    const obras = await deps.doCache(filtro.termo);

    // Banco vazio não vira tela de "cache vazio": segue sendo indisponível, que
    // é a verdade — não temos o que mostrar porque o terceiro está fora.
    return obras.length === 0
      ? { estado: "indisponivel", termo: filtro.termo }
      : { estado: "cache", termo: filtro.termo, obras };
  }
  catch
  {
    // Os dois fora. A tela do terceiro indisponível continua sendo a resposta
    // honesta, e o 500 não entra em cena.
    return { estado: "indisponivel", termo: filtro.termo };
  }
}
