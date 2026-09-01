// `Media` é cache do AniList, endereçado por `anilistId`. Upsert: a linha nova
// nasce, a existente é regravada com `syncedAt` novo — nunca duplica.
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { getPrisma } from "./prisma";

export type MediaEmCache = {
  id: string;
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
    description: obra.description ?? null,
    chapters: obra.chapters ?? null,
    syncedAt: sincronizadoEm,
  };

  return getPrisma().media.upsert({
    where: { anilistId: obra.anilistId },
    create: { anilistId: obra.anilistId, ...dados },
    update: dados,
    select: { id: true, syncedAt: true },
  });
}
