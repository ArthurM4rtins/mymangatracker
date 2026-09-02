// Os agregados do perfil público (issue #49). Tudo aqui recebe o userId já
// resolvido pelo username e devolve só o que pode ser público: o que a pessoa
// fez em cima de obras (nota, resenha, curtida) — nada de status da estante,
// progresso, fonte ou capítulo. A estante do dono vem do shelf.repository,
// e só o serviço decide quando ela entra.
import { getPrisma } from "./prisma";

type ObraDoPerfil = {
  anilistId: number;
  titleRomaji: string;
  titleEnglish: string | null;
  coverImageUrl: string | null;
};

export type AvaliadaDoPerfil = ObraDoPerfil & {
  rating: number;
  avaliadaEm: Date;
};

export type ResenhaDoPerfil = ObraDoPerfil & {
  entryId: string;
  rating: string | null;
  review: string;
  containsSpoilers: boolean;
  publicadaEm: Date;
  curtidas: number;
};

const SELECT_DA_OBRA = {
  anilistId: true,
  titleRomaji: true,
  titleEnglish: true,
  coverImageUrl: true,
} as const;

/** Todas as obras que o usuário deu nota. Ordem e filtro são do domínio. */
export async function listarAvaliadas(userId: string): Promise<AvaliadaDoPerfil[]>
{
  const linhas = await getPrisma().entry.findMany({
    where: { userId, rating: { not: null } },
    select: { rating: true, reviewedAt: true, media: { select: SELECT_DA_OBRA } },
  });

  return linhas.map(function (linha)
  {
    return {
      ...linha.media,
      rating: Number(linha.rating),
      avaliadaEm: linha.reviewedAt,
    };
  });
}

/** Quantas resenhas com texto o usuário escreveu. */
export function contarResenhas(userId: string): Promise<number>
{
  return getPrisma().entry.count({
    where: { userId, review: { not: null } },
  });
}

/** Quantas resenhas alheias o usuário curtiu. */
export function contarCurtidasDadas(userId: string): Promise<number>
{
  return getPrisma().reviewLike.count({ where: { userId } });
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
      media: { select: SELECT_DA_OBRA },
    },
  });

  return linhas.map(function (linha)
  {
    return {
      ...linha.media,
      entryId: linha.id,
      rating: linha.rating?.toString() ?? null,
      review: linha.review ?? "",
      containsSpoilers: linha.containsSpoilers,
      publicadaEm: linha.reviewedAt,
      curtidas: linha._count.likes,
    };
  });
}
