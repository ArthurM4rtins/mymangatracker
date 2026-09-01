/**
 * Busca no catalogo. Nao toca banco: e o que faz `/catalogo` mostrar algo real
 * mesmo com o Postgres fora.
 *
 * O cache em `Media` entra na tarefa da estante, que ja precisa da linha para o
 * `ShelfEntry.mediaId` — ver o desvio registrado em
 * `Obsidian/02. Implementacoes/slice-vertical/CLAUDE.md`.
 */
import { buscarMedia, buscarPopulares } from "@/server/infra/anilist";
import type { MediaDoAniList } from "@/server/domain/anilist-media";

export type ResultadoBusca =
  | { estado: "ok"; termo: string; obras: MediaDoAniList[] }
  | { estado: "destaques"; termo: ""; obras: MediaDoAniList[] }
  | { estado: "vazio"; termo: string }
  | { estado: "indisponivel"; termo: string };

/**
 * Nunca levanta. A tela é pública e o AniList é de terceiro: fora do ar, a
 * página informa e continua de pé em vez de virar erro 500.
 *
 * Sem termo, a resposta são os populares (`destaques`) — o catálogo abre com
 * vitrine, não com tela em branco.
 */
export async function buscarNoCatalogo(termo: string): Promise<ResultadoBusca>
{
  const limpo = termo.trim();

  try
  {
    if (limpo === "")
    {
      const obras = await buscarPopulares();

      return obras.length === 0
        ? { estado: "vazio", termo: "" }
        : { estado: "destaques", termo: "", obras };
    }

    const obras = await buscarMedia(limpo);

    return obras.length === 0
      ? { estado: "vazio", termo: limpo }
      : { estado: "ok", termo: limpo, obras };
  }
  catch
  {
    // O motivo fica no log da plataforma. A tela não mostra texto de erro de
    // terceiro, que pode conter URL interna ou detalhe de infraestrutura.
    return { estado: "indisponivel", termo: limpo };
  }
}
