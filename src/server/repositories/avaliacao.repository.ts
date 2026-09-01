// Entry: a avaliação do usuário — nota e/ou resenha, uma por (userId, mediaId).
// Toda consulta carrega userId. Visível só ao dono até a fase social.
import { getPrisma } from "./prisma";

export type AvaliacaoDaObra = {
  mediaId: string;
  rating: string | null;
  review: string | null;
  containsSpoilers: boolean;
};

/**
 * Upsert por (userId, mediaId) — avaliar de novo edita, nunca duplica.
 * `reviewedAt` fica o da primeira avaliação; `updatedAt` conta as edições.
 */
export async function salvarAvaliacao(dados: {
  userId: string;
  mediaId: string;
  rating: number | null;
  review: string | null;
  containsSpoilers: boolean;
}): Promise<{ id: string }>
{
  const campos = {
    rating: dados.rating,
    review: dados.review,
    containsSpoilers: dados.containsSpoilers,
  };

  return getPrisma().entry.upsert({
    where: {
      userId_mediaId: { userId: dados.userId, mediaId: dados.mediaId },
    },
    create: { userId: dados.userId, mediaId: dados.mediaId, ...campos },
    update: campos,
    select: { id: true },
  });
}

/** As avaliações do usuário, para a listagem da estante compor numa ida só. */
export async function listarAvaliacoes(userId: string): Promise<AvaliacaoDaObra[]>
{
  const linhas = await getPrisma().entry.findMany({
    where: { userId },
    select: {
      mediaId: true,
      rating: true,
      review: true,
      containsSpoilers: true,
    },
  });

  return linhas.map(function (linha)
  {
    return {
      mediaId: linha.mediaId,
      rating: linha.rating?.toString() ?? null,
      review: linha.review,
      containsSpoilers: linha.containsSpoilers,
    };
  });
}

/**
 * Remove a avaliação DO USUÁRIO. `null` quando não existe ou é de outro —
 * iguais de propósito.
 */
export async function removerAvaliacao(
  userId: string,
  mediaId: string,
): Promise<{ removida: true } | null>
{
  const resultado = await getPrisma().entry.deleteMany({
    where: { userId, mediaId },
  });

  return resultado.count === 0 ? null : { removida: true };
}
