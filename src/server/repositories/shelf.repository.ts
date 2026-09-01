// ShelfEntry: uma linha por obra por usuário — `@@unique([userId, mediaId])` é
// regra do banco, e o upsert aqui só a respeita. Toda operação carrega userId.
import type { ShelfStatus } from "@/generated/prisma/enums";
import { getPrisma } from "./prisma";

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
