// ShelfEntry: uma linha por obra por usuário — `@@unique([userId, mediaId])` é
// regra do banco, e o upsert aqui só a respeita. Toda operação carrega userId.
import type { ShelfStatus } from "@/generated/prisma/enums";
import { getPrisma } from "./prisma";

/** Uma entrada com o recorte da obra que a tela da estante mostra. */
export type EntradaComObra = {
  entradaId: string;
  mediaId: string;
  status: ShelfStatus;
  progressChapter: string | null;
  obra: {
    titleRomaji: string;
    titleEnglish: string | null;
    coverImageUrl: string | null;
    type: "MANGA" | "NOVEL";
    countryOfOrigin: string | null;
    chapters: number | null;
  };
};

/**
 * A estante de um usuário, opcionalmente filtrada por status. O `userId` no
 * where não é opcional por tipo de propósito: estante é privada, e a consulta
 * da aba anda sobre o índice `@@index([userId, status])`.
 */
export async function listarEntradasDoUsuario(
  userId: string,
  status?: ShelfStatus,
): Promise<EntradaComObra[]>
{
  const linhas = await getPrisma().shelfEntry.findMany({
    where: { userId, ...(status !== undefined && { status }) },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      mediaId: true,
      status: true,
      progressChapter: true,
      media: {
        select: {
          titleRomaji: true,
          titleEnglish: true,
          coverImageUrl: true,
          type: true,
          countryOfOrigin: true,
          chapters: true,
        },
      },
    },
  });

  return linhas.map(function (linha)
  {
    return {
      entradaId: linha.id,
      mediaId: linha.mediaId,
      status: linha.status,
      progressChapter: linha.progressChapter?.toString() ?? null,
      obra: linha.media,
    };
  });
}

/**
 * Uma entrada específica DO USUÁRIO, com o mínimo que os fluxos de fonte e
 * progresso precisam. `null` para entrada alheia ou inexistente — iguais.
 */
export function buscarEntradaDoUsuario(
  userId: string,
  entradaId: string,
): Promise<{ entradaId: string; mediaId: string; progressChapter: string | null } | null>
{
  return getPrisma()
    .shelfEntry.findFirst({
      where: { id: entradaId, userId },
      select: { id: true, mediaId: true, progressChapter: true },
    })
    .then(function (linha)
    {
      if (linha === null)
      {
        return null;
      }

      return {
        entradaId: linha.id,
        mediaId: linha.mediaId,
        progressChapter: linha.progressChapter?.toString() ?? null,
      };
    });
}

/**
 * Muda o status de uma entrada DO USUÁRIO. `null` quando a entrada não existe
 * ou pertence a outro — indistinguíveis de propósito: não revelamos que a
 * entrada alheia existe.
 */
export async function atualizarStatusDaEntrada(
  userId: string,
  entradaId: string,
  status: ShelfStatus,
): Promise<{ id: string } | null>
{
  const resultado = await getPrisma().shelfEntry.updateMany({
    where: { id: entradaId, userId },
    data: { status },
  });

  return resultado.count === 0 ? null : { id: entradaId };
}

/**
 * A entrada DO USUÁRIO para uma obra específica — o que a página da obra
 * precisa para mostrar os controles. `null` = não está na estante.
 */
export async function buscarEntradaPorMedia(
  userId: string,
  mediaId: string,
): Promise<{ entradaId: string; status: ShelfStatus; progressChapter: string | null } | null>
{
  const linha = await getPrisma().shelfEntry.findUnique({
    where: { userId_mediaId: { userId, mediaId } },
    select: { id: true, status: true, progressChapter: true },
  });

  if (linha === null)
  {
    return null;
  }

  return {
    entradaId: linha.id,
    status: linha.status,
    progressChapter: linha.progressChapter?.toString() ?? null,
  };
}

/**
 * Edição manual do capítulo em leitura — correção do dono, seta direto
 * (inclusive para trás). `null` para entrada alheia ou inexistente, iguais.
 */
export async function atualizarProgressoDaEntrada(
  userId: string,
  entradaId: string,
  capitulo: number,
): Promise<{ id: string } | null>
{
  const resultado = await getPrisma().shelfEntry.updateMany({
    where: { id: entradaId, userId },
    data: { progressChapter: capitulo },
  });

  return resultado.count === 0 ? null : { id: entradaId };
}

/**
 * Os anilistIds das obras na estante DO USUÁRIO — o catálogo usa para marcar
 * o que já foi adicionado sem uma consulta por card.
 */
export async function listarAnilistIdsDaEstante(userId: string): Promise<number[]>
{
  const linhas = await getPrisma().shelfEntry.findMany({
    where: { userId },
    select: { media: { select: { anilistId: true } } },
  });

  return linhas.map(function (linha) { return linha.media.anilistId; });
}

export function adicionarOuAtualizarEntrada(dados: {
  userId: string;
  mediaId: string;
  status: ShelfStatus;
}): Promise<{ id: string }>
{
  return getPrisma().shelfEntry.upsert({
    where: {
      userId_mediaId: { userId: dados.userId, mediaId: dados.mediaId },
    },
    create: dados,
    update: { status: dados.status },
    select: { id: true },
  });
}
