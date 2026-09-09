// `Media` é cache do AniList, endereçado por `anilistId`. Upsert: a linha nova
// nasce, a existente é regravada com `syncedAt` novo — nunca duplica.
import type { AutorDaObra, MediaDoAniList } from "@/server/domain/anilist-media";
import { getPrisma } from "./prisma";

export type MediaEmCache = {
  id: string;
  syncedAt: Date;
};

/**
 * Quantas linhas o fallback do catálogo devolve. Teto obrigatório: leitura
 * pública sem `take` é o achado 5 da auditoria (#135), e esta consulta é
 * anônima.
 */
const OBRAS_DO_FALLBACK = 24;

/**
 * As obras já cacheadas que casam com o termo (#165). Serve o catálogo quando o
 * AniList está fora — só isso: com o terceiro de pé o catálogo continua ao vivo,
 * senão a busca viraria um índice das poucas obras que alguém já abriu.
 *
 * Termo vazio devolve as mais recentes, que é a vitrine possível sem o terceiro.
 * A busca é por prefixo/trecho, sem acento nem stemming: é fallback, não motor
 * de busca.
 */
export async function buscarMediasEmCache(termo: string): Promise<MediaDoAniList[]>
{
  const limpo = termo.trim();

  const linhas = await getPrisma().media.findMany({
    where: limpo === ""
      ? undefined
      : {
          OR: [
            { titleRomaji: { contains: limpo, mode: "insensitive" } },
            { titleEnglish: { contains: limpo, mode: "insensitive" } },
            { titleNative: { contains: limpo, mode: "insensitive" } },
          ],
        },
    orderBy: [{ syncedAt: "desc" }, { id: "desc" }],
    take: OBRAS_DO_FALLBACK,
    select: {
      anilistId: true,
      type: true,
      countryOfOrigin: true,
      titleRomaji: true,
      titleEnglish: true,
      titleNative: true,
      coverImageUrl: true,
      description: true,
      chapters: true,
      startYear: true,
      averageScore: true,
    },
  });

  return linhas.map(function (linha)
  {
    return {
      anilistId: linha.anilistId,
      type: linha.type,
      titleRomaji: linha.titleRomaji,
      ...(linha.countryOfOrigin === null ? {} : { countryOfOrigin: linha.countryOfOrigin }),
      ...(linha.titleEnglish === null ? {} : { titleEnglish: linha.titleEnglish }),
      ...(linha.titleNative === null ? {} : { titleNative: linha.titleNative }),
      ...(linha.coverImageUrl === null ? {} : { coverImageUrl: linha.coverImageUrl }),
      ...(linha.description === null ? {} : { description: linha.description }),
      ...(linha.chapters === null ? {} : { chapters: linha.chapters }),
      ...(linha.startYear === null ? {} : { startYear: linha.startYear }),
      ...(linha.averageScore === null ? {} : { averageScore: linha.averageScore }),
    };
  });
}

/** O recorte completo que a página da obra mostra. */
export type MediaCompleta = {
  id: string;
  anilistId: number;
  type: "MANGA" | "NOVEL";
  countryOfOrigin: string | null;
  titleRomaji: string;
  titleEnglish: string | null;
  titleNative: string | null;
  coverImageUrl: string | null;
  bannerImageUrl: string | null;
  description: string | null;
  chapters: number | null;
  startYear: number | null;
  genres: string[];
  averageScore: number | null;
  autores: AutorDaObra[];
  syncedAt: Date;
};

export function buscarMediaPorAnilistId(
  anilistId: number,
): Promise<MediaEmCache | null>
{
  return getPrisma().media.findUnique({
    where: { anilistId },
    select: { id: true, syncedAt: true },
  });
}

export async function buscarMediaCompletaPorAnilistId(
  anilistId: number,
): Promise<MediaCompleta | null>
{
  const linha = await getPrisma().media.findUnique({
    where: { anilistId },
    select: {
      id: true,
      anilistId: true,
      type: true,
      countryOfOrigin: true,
      titleRomaji: true,
      titleEnglish: true,
      titleNative: true,
      coverImageUrl: true,
      bannerImageUrl: true,
      description: true,
      chapters: true,
      startYear: true,
      genres: true,
      averageScore: true,
      authors: true,
      syncedAt: true,
    },
  });

  if (linha === null)
  {
    return null;
  }

  const { authors, ...resto } = linha;

  return { ...resto, autores: autoresDoJson(authors) };
}

export function salvarMediaDoAniList(
  obra: MediaDoAniList,
  sincronizadoEm: Date,
): Promise<MediaEmCache>
{
  const dados = {
    type: obra.type,
    countryOfOrigin: obra.countryOfOrigin ?? null,
    titleRomaji: obra.titleRomaji,
    titleEnglish: obra.titleEnglish ?? null,
    titleNative: obra.titleNative ?? null,
    coverImageUrl: obra.coverImageUrl ?? null,
    bannerImageUrl: obra.bannerImageUrl ?? null,
    description: obra.description ?? null,
    chapters: obra.chapters ?? null,
    startYear: obra.startYear ?? null,
    genres: obra.genres ?? [],
    averageScore: obra.averageScore ?? null,
    authors: obra.autores ?? [],
    syncedAt: sincronizadoEm,
  };

  return getPrisma().media.upsert({
    where: { anilistId: obra.anilistId },
    create: { anilistId: obra.anilistId, ...dados },
    update: dados,
    select: { id: true, syncedAt: true },
  });
}

/** O Json do banco de volta ao tipo do domínio, descartando o que não casa. */
function autoresDoJson(valor: unknown): AutorDaObra[]
{
  if (!Array.isArray(valor))
  {
    return [];
  }

  const autores: AutorDaObra[] = [];

  valor.forEach(function (item)
  {
    if (
      typeof item === "object" &&
      item !== null &&
      typeof (item as AutorDaObra).anilistStaffId === "number" &&
      typeof (item as AutorDaObra).nome === "string" &&
      typeof (item as AutorDaObra).papel === "string"
    )
    {
      autores.push({
        anilistStaffId: (item as AutorDaObra).anilistStaffId,
        nome: (item as AutorDaObra).nome,
        papel: (item as AutorDaObra).papel,
      });
    }
  });

  return autores;
}
