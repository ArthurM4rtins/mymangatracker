// Apoio dos testes que tocam o banco. Não termina em `.test.ts`, então o vitest
// não coleta este arquivo como suíte.
import { getPrisma } from "@/server/repositories/prisma";

export async function limparBanco(): Promise<void>
{
  const prisma = getPrisma();

  // A ordem respeita as FKs: o que aponta some antes do que é apontado.
  await prisma.readingProgress.deleteMany();
  await prisma.readingSource.deleteMany();
  await prisma.reviewLike.deleteMany();
  await prisma.reviewComment.deleteMany();
  await prisma.entry.deleteMany();
  await prisma.shelfEntry.deleteMany();
  await prisma.media.deleteMany();
  await prisma.user.deleteMany();
}

export async function semearUsuario(username: string)
{
  return getPrisma().user.create({
    data: {
      username,
      email: `${username}@exemplo.test`,
      passwordHash: "hash-de-teste",
    },
  });
}

export async function semearMedia(anilistId: number)
{
  return getPrisma().media.create({
    data: {
      anilistId,
      type: "MANGA",
      countryOfOrigin: "KR",
      titleRomaji: `Obra ${anilistId}`,
      syncedAt: new Date(),
    },
  });
}
