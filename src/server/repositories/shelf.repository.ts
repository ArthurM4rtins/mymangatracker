// ShelfEntry: uma linha por obra por usuário — `@@unique([userId, mediaId])` é
// regra do banco, e o upsert aqui só a respeita. Toda operação carrega userId.
import type { ShelfStatus } from "@/generated/prisma/enums";
import { getPrisma } from "./prisma";

/** Uma entrada com o recorte da obra que a tela da estante mostra. */
export type EntradaComObra = {
  entradaId: string;
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
      status: linha.status,
      progressChapter: linha.progressChapter?.toString() ?? null,
      obra: linha.media,
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
