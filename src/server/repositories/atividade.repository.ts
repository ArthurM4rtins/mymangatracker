// O feed da comunidade (issue #50). LEITURA PÚBLICA, mesmo recorte do social:
// só resenhas COM TEXTO, username de quem escreveu, e-mail e ids de usuário
// nunca. Progresso e fonte não passam nem perto daqui.
import { getPrisma } from "./prisma";

export type ResenhaDaComunidade = {
  entryId: string;
  username: string;
  anilistId: number;
  titulo: string;
  coverImageUrl: string | null;
  rating: string | null;
  review: string;
  containsSpoilers: boolean;
  curtidas: number;
  quando: Date;
};

/** As resenhas com texto mais recentes de todo mundo. */
export async function listarResenhasDaComunidade(
  limite: number,
): Promise<ResenhaDaComunidade[]>
{
  const linhas = await getPrisma().entry.findMany({
    where: { review: { not: null } },
    orderBy: { reviewedAt: "desc" },
    take: limite,
    select: {
      id: true,
      rating: true,
      review: true,
      containsSpoilers: true,
      reviewedAt: true,
      user: { select: { username: true } },
      media: {
        select: { anilistId: true, titleRomaji: true, titleEnglish: true, coverImageUrl: true },
      },
      _count: { select: { likes: true } },
    },
  });

  return linhas.map(function (linha)
  {
    return {
      entryId: linha.id,
      username: linha.user.username,
      anilistId: linha.media.anilistId,
      titulo: linha.media.titleEnglish ?? linha.media.titleRomaji,
      coverImageUrl: linha.media.coverImageUrl,
      rating: linha.rating?.toString() ?? null,
      review: linha.review ?? "",
      containsSpoilers: linha.containsSpoilers,
      curtidas: linha._count.likes,
      quando: linha.reviewedAt,
    };
  });
}
