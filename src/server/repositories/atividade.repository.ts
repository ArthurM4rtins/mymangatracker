// O feed da comunidade (issue #50). LEITURA PÚBLICA, mesmo recorte do social:
// só resenhas COM TEXTO, username de quem escreveu, e-mail e ids de usuário
// nunca. Progresso e fonte não passam nem perto daqui.
import { chaveDaObra, referenciaDeMedia } from "@/server/domain/referencia-da-obra";
import { getPrisma } from "./prisma";

export type ResenhaDaComunidade = {
  entryId: string;
  username: string;
  chave: string;
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
  publishedAt: true,
  createdAt: true,
  user: { select: { username: true } },
  media: {
    select: { anilistId: true,
      kitsuId: true, titleRomaji: true, titleEnglish: true, coverImageUrl: true },
  },
  _count: { select: { likes: true } },
} as const;

type LinhaDaResenha = {
  id: string;
  rating: { toString(): string } | null;
  review: string | null;
  containsSpoilers: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  user: { username: string };
  media: {
    chave: string;
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
    chave: linha.media.chave,
    titulo: linha.media.titleEnglish ?? linha.media.titleRomaji,
    coverImageUrl: linha.media.coverImageUrl,
    rating: linha.rating?.toString() ?? null,
    review: linha.review ?? "",
    containsSpoilers: linha.containsSpoilers,
    curtidas: linha._count.likes,
    quando: linha.publishedAt ?? linha.createdAt,
  };
}

/** As resenhas com texto mais recentes de todo mundo. */
export async function listarResenhasDaComunidade(
  limite: number,
): Promise<ResenhaDaComunidade[]>
{
  const linhas = await getPrisma().entry.findMany({
    where: { review: { not: null } },
    // A data publica e `publishedAt` (#143): carimbada uma vez, na transicao de
    // vazio para texto. `reviewedAt` virou historico da linha e nao ordena mais
    // nada aqui — apagar e reescrever o texto o recarimbava, e isso levava a
    // resenha de volta ao topo em duas requisicoes.
    orderBy: { publishedAt: "desc" },
    take: limite,
    select: SELECT_DA_RESENHA,
  });

  return linhas
    .map(function (linha)
    {
      return paraResenha({
        ...linha,
        media: {
          ...linha.media,
          chave: chaveDaObra(referenciaDeMedia(linha.media) ?? { fonte: "anilist", id: 0 }),
        },
      });
    });
}
