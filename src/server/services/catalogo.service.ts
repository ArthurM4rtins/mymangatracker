/**
 * Busca no catalogo. Nao toca banco: e o que faz `/catalogo` mostrar algo real
 * mesmo com o Postgres fora.
 *
 * O cache em `Media` entra na tarefa da estante, que ja precisa da linha para o
 * `ShelfEntry.mediaId` — ver o desvio registrado em
 * `Obsidian/02. Implementacoes/slice-vertical/CLAUDE.md`.
 */
import { buscarFiltrado, buscarPopulares } from "@/server/infra/anilist";
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
  | { estado: "muitos_pedidos"; termo: string };

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
    return { estado: "indisponivel", termo: filtro.termo };
  }
}
