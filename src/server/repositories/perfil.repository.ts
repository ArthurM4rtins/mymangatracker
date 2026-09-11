// Os agregados do perfil público (issue #49). Tudo aqui recebe o userId já
// resolvido pelo username e devolve só o que pode ser público: o que a pessoa
// fez em cima de obras (nota, resenha, curtida) — nada de status da estante,
// progresso, fonte ou capítulo. A estante do dono vem do shelf.repository,
// e só o serviço decide quando ela entra.
import { chaveDaObra, referenciaDeMedia } from "@/server/domain/referencia-da-obra";
import { getPrisma } from "./prisma";

type ObraDoPerfil = {
  chave: string;
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
      kitsuId: true,
  titleRomaji: true,
  titleEnglish: true,
  coverImageUrl: true,
} as const;

/**
 * As obras que o usuário deu nota, as `limite` mais recentes (#135): o perfil
 * de quem inflou a conta não materializa tudo a cada visita. Ordem e filtro
 * finos continuam no domínio, dentro dessa página.
 */
export async function listarAvaliadas(userId: string, limite: number): Promise<AvaliadaDoPerfil[]>
{
  const linhas = await getPrisma().entry.findMany({
    where: { userId, rating: { not: null } },
    orderBy: { reviewedAt: "desc" },
    take: limite,
    select: { rating: true, reviewedAt: true, media: { select: SELECT_DA_OBRA } },
  });

  return linhas
    .map(function (linha)
  {
    return {
      ...linha.media,
      chave: chaveDaObra(referenciaDeMedia(linha.media) ?? { fonte: "anilist", id: 0 }),
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
    // A data publica e `publishedAt` (#143). A lista de AVALIADAS acima segue
    // por `reviewedAt`: la o que importa e quando a pessoa avaliou, nao quando
    // publicou texto.
    orderBy: { publishedAt: "desc" },
    take: limite,
    select: {
      id: true,
      rating: true,
      review: true,
      containsSpoilers: true,
      publishedAt: true,
      createdAt: true,
      _count: { select: { likes: true } },
      media: { select: SELECT_DA_OBRA },
    },
  });

  return linhas
    .map(function (linha)
  {
    return {
      ...linha.media,
      chave: chaveDaObra(referenciaDeMedia(linha.media) ?? { fonte: "anilist", id: 0 }),
      entryId: linha.id,
      rating: linha.rating?.toString() ?? null,
      review: linha.review ?? "",
      containsSpoilers: linha.containsSpoilers,
      publicadaEm: linha.publishedAt ?? linha.createdAt,
      curtidas: linha._count.likes,
    };
  });
}

/** Quantas obras o usuário deu nota — o número do perfil, sem materializar (#135). */
export function contarAvaliadas(userId: string): Promise<number>
{
  return getPrisma().entry.count({ where: { userId, rating: { not: null } } });
}
