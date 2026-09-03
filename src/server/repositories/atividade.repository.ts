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

const SELECT_DA_RESENHA = {
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
} as const;

type LinhaDaResenha = {
  id: string;
  rating: { toString(): string } | null;
  review: string | null;
  containsSpoilers: boolean;
  reviewedAt: Date;
  user: { username: string };
  media: {
    anilistId: number;
    titleRomaji: string;
    titleEnglish: string | null;
    coverImageUrl: string | null;
  };
  _count: { likes: number };
};

function paraResenha(linha: LinhaDaResenha): ResenhaDaComunidade
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
}

/** As resenhas com texto mais recentes de todo mundo. */
export async function listarResenhasDaComunidade(
  limite: number,
): Promise<ResenhaDaComunidade[]>
{
  const linhas = await getPrisma().entry.findMany({
    where: { review: { not: null } },
    orderBy: { reviewedAt: "desc" },
    take: limite,
    select: SELECT_DA_RESENHA,
  });

  return linhas.map(paraResenha);
}

/**
 * As resenhas que mais receberam curtidas DESDE uma data (issue #76): o que
 * está quente agora, não o acumulado. Agrupa as curtidas da janela e busca
 * as resenhas na ordem do agrupamento. Sem curtida na janela = vazio.
 */
export async function listarResenhasMaisCurtidas(
  desde: Date,
  limite: number,
): Promise<ResenhaDaComunidade[]>
{
  const prisma = getPrisma();

  const grupos = await prisma.reviewLike.groupBy({
    by: ["entryId"],
    where: { createdAt: { gte: desde }, entry: { review: { not: null } } },
    _count: { entryId: true },
    orderBy: { _count: { entryId: "desc" } },
    take: limite,
  });

  if (grupos.length === 0)
  {
    return [];
  }

  const linhas = await prisma.entry.findMany({
    where: { id: { in: grupos.map(function (g) { return g.entryId; }) } },
    select: SELECT_DA_RESENHA,
  });

  const porId = new Map(linhas.map(function (linha) { return [linha.id, linha]; }));

  return grupos.flatMap(function (g)
  {
    const linha = porId.get(g.entryId);

    return linha === undefined ? [] : [paraResenha(linha)];
  });
}
