// O social das resenhas (issue #39). AS RESENHAS COM TEXTO SÃO PÚBLICAS:
// esta é a única leitura do sistema sem userId no where, consciente e
// restrita a Entry com review não nulo. De quem escreveu sai o username e
// NADA além — e-mail nunca. Progresso e fonte seguem privados.
import { getPrisma } from "./prisma";

export type ComentarioDaReview = {
  id: string;
  username: string;
  /** Versão da foto de quem escreveu (issue #87); `null` sem foto. */
  avatarVersao: number | null;
  texto: string;
  criadoEm: Date;
  meu: boolean;
};

export type ReviewPublica = {
  entryId: string;
  username: string;
  avatarVersao: number | null;
  minha: boolean;
  rating: string | null;
  review: string;
  containsSpoilers: boolean;
  publicadaEm: Date;
  curtidas: number;
  curtiPorMim: boolean;
  comentarios: ComentarioDaReview[];
};

/**
 * As resenhas públicas da obra: mais curtidas primeiro, desempate recente.
 * `userId` (opcional) só marca "curti/meu" — não filtra nada.
 */
export async function listarReviewsDaObra(
  mediaId: string,
  userId: string | null,
): Promise<ReviewPublica[]>
{
  const linhas = await getPrisma().entry.findMany({
    where: { mediaId, review: { not: null } },
    orderBy: [{ likes: { _count: "desc" } }, { reviewedAt: "desc" }],
    select: {
      id: true,
      userId: true,
      rating: true,
      review: true,
      containsSpoilers: true,
      reviewedAt: true,
      user: { select: { username: true, avatarUpdatedAt: true } },
      _count: { select: { likes: true } },
      likes:
        userId === null
          ? false
          : { where: { userId }, select: { id: true } },
      comentarios: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          userId: true,
          texto: true,
          createdAt: true,
          user: { select: { username: true, avatarUpdatedAt: true } },
        },
      },
    },
  });

  return linhas.map(function (linha)
  {
    return {
      entryId: linha.id,
      username: linha.user.username,
      avatarVersao: linha.user.avatarUpdatedAt?.getTime() ?? null,
      minha: linha.userId === userId,
      rating: linha.rating?.toString() ?? null,
      review: linha.review ?? "",
      containsSpoilers: linha.containsSpoilers,
      publicadaEm: linha.reviewedAt,
      curtidas: linha._count.likes,
      curtiPorMim: Array.isArray(linha.likes) && linha.likes.length > 0,
      comentarios: linha.comentarios.map(function (comentario)
      {
        return {
          id: comentario.id,
          username: comentario.user.username,
          avatarVersao: comentario.user.avatarUpdatedAt?.getTime() ?? null,
          texto: comentario.texto,
          criadoEm: comentario.createdAt,
          meu: comentario.userId === userId,
        };
      }),
    };
  });
}

/**
 * Toggle da curtida. `null` quando a resenha não existe (FK estoura no
 * create). Devolve o estado final e o total.
 */
export async function alternarCurtida(
  entryId: string,
  userId: string,
): Promise<{ curtida: boolean; total: number } | null>
{
  const prisma = getPrisma();

  const existente = await prisma.reviewLike.findUnique({
    where: { entryId_userId: { entryId, userId } },
    select: { id: true },
  });

  try
  {
    if (existente === null)
    {
      await prisma.reviewLike.create({ data: { entryId, userId } });
    }
    else
    {
      await prisma.reviewLike.delete({ where: { id: existente.id } });
    }
  }
  catch
  {
    // FK: resenha (ou usuário) não existe. Mesma resposta de inexistente.
    return null;
  }

  const total = await prisma.reviewLike.count({ where: { entryId } });

  return { curtida: existente === null, total };
}

/** Comenta na resenha. `null` quando ela não existe (FK). */
export async function comentarNaReview(
  entryId: string,
  userId: string,
  texto: string,
): Promise<{ id: string } | null>
{
  try
  {
    return await getPrisma().reviewComment.create({
      data: { entryId, userId, texto },
      select: { id: true },
    });
  }
  catch
  {
    return null;
  }
}

/**
 * Apaga um comentário DO PRÓPRIO usuário. Alheio ou inexistente = `null`,
 * iguais de propósito.
 */
export async function apagarComentario(
  userId: string,
  comentarioId: string,
): Promise<{ removido: true } | null>
{
  const resultado = await getPrisma().reviewComment.deleteMany({
    where: { id: comentarioId, userId },
  });

  return resultado.count === 0 ? null : { removido: true };
}
