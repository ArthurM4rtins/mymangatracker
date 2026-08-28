/**
 * Busca no catalogo. Nao toca banco: e o que faz `/catalogo` mostrar algo real
 * mesmo com o Postgres fora.
 *
 * O cache em `Media` entra na tarefa da estante, que ja precisa da linha para o
 * `ShelfEntry.mediaId` — ver o desvio registrado em
 * `Obsidian/02. Implementacoes/slice-vertical/CLAUDE.md`.
 */
import { buscarMedia } from "@/server/infra/anilist";
import type { MediaDoAniList } from "@/server/domain/anilist-media";

export type ResultadoBusca =
  | { estado: "ok"; termo: string; obras: MediaDoAniList[] }
  | { estado: "vazio"; termo: string }
  | { estado: "indisponivel"; termo: string };

/**
 * Nunca levanta. A tela é pública e o AniList é de terceiro: fora do ar, a
 * página informa e continua de pé em vez de virar erro 500.
 */
export async function buscarNoCatalogo(termo: string): Promise<ResultadoBusca>
{
  const limpo = termo.trim();

  if (limpo === "")
  {
    return { estado: "vazio", termo: limpo };
  }

  try
  {
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
