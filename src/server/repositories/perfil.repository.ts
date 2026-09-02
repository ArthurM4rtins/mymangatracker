// Os agregados do perfil público (issue #49). Tudo aqui recebe o userId já
// resolvido pelo username e devolve só o que pode ser público: contagens,
// resenhas COM TEXTO e nada de progresso, fonte ou capítulo.
import type { StatusDaEstante } from "@/server/domain/perfil";
import { getPrisma } from "./prisma";

export type ResenhaDoPerfil = {
  entryId: string;
  anilistId: number;
  titleRomaji: string;
  titleEnglish: string | null;
  coverImageUrl: string | null;
  rating: string | null;
  review: string;
  containsSpoilers: boolean;
  publicadaEm: Date;
  curtidas: number;
};

/** Quantas obras por status — só os status que têm linha. */
export async function contarEstantePorStatus(
  userId: string,
): Promise<Array<{ status: StatusDaEstante; total: number }>>
{
  const grupos = await getPrisma().shelfEntry.groupBy({
    by: ["status"],
    where: { userId },
    _count: { _all: true },
  });

  return grupos.map(function (grupo)
  {
    return { status: grupo.status, total: grupo._count._all };
  });
}

/** Quantas obras o usuário deu nota. */
export function contarAvaliacoes(userId: string): Promise<number>
{
  return getPrisma().entry.count({
    where: { userId, rating: { not: null } },
  });
}

/** As resenhas com texto mais recentes do usuário, com a obra de cada uma. */
export async function listarResenhasRecentes(
  userId: string,
  limite: number,
): Promise<ResenhaDoPerfil[]>
{
  const linhas = await getPrisma().entry.findMany({
    where: { userId, review: { not: null } },
    orderBy: { reviewedAt: "desc" },
    take: limite,
    select: {
      id: true,
      rating: true,
      review: true,
      containsSpoilers: true,
      reviewedAt: true,
      _count: { select: { likes: true } },
      media: {
        select: {
          anilistId: true,
          titleRomaji: true,
          titleEnglish: true,
          coverImageUrl: true,
        },
      },
    },
  });

  return linhas.map(function (linha)
  {
    return {
      entryId: linha.id,
      anilistId: linha.media.anilistId,
      titleRomaji: linha.media.titleRomaji,
      titleEnglish: linha.media.titleEnglish,
      coverImageUrl: linha.media.coverImageUrl,
      rating: linha.rating?.toString() ?? null,
      review: linha.review ?? "",
      containsSpoilers: linha.containsSpoilers,
      publicadaEm: linha.reviewedAt,
      curtidas: linha._count.likes,
    };
  });
}
