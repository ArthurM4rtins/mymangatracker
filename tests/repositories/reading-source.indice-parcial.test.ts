// Prova o índice único parcial escrito à mão na migration: muitas fontes por
// obra, só uma ativa. Se alguém regenerar a migration e perder o índice, este
// teste quebra.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "@/server/repositories/prisma";
import { limparBanco, semearMedia, semearUsuario } from "./apoio";

function fonte(userId: string, mediaId: string, isActive: boolean)
{
  return {
    userId,
    mediaId,
    isActive,
    sourceHost: isActive ? "novo.test" : "antigo.test",
    urlTemplate: "/title/Obra/chapter/{chapter}/1",
  };
}

describe("reading-source: uma fonte ativa por obra", () =>
{
  beforeEach(async () =>
  {
    await limparBanco();
  });

  afterAll(async () =>
  {
    await getPrisma().$disconnect();
  });

  it("o banco recusa a segunda fonte ativa da mesma obra", async () =>
  {
    const alice = await semearUsuario("alice");
    const media = await semearMedia(1);
    const prisma = getPrisma();

    await prisma.readingSource.create({ data: fonte(alice.id, media.id, true) });

    await expect(
      prisma.readingSource.create({ data: fonte(alice.id, media.id, true) }),
    ).rejects.toThrow();
  });

  it("aceita quantas fontes inativas quiser na mesma obra", async () =>
  {
    const alice = await semearUsuario("alice");
    const media = await semearMedia(1);
    const prisma = getPrisma();

    await prisma.readingSource.create({ data: fonte(alice.id, media.id, false) });
    await prisma.readingSource.create({ data: fonte(alice.id, media.id, false) });
    await prisma.readingSource.create({ data: fonte(alice.id, media.id, true) });

    expect(
      await prisma.readingSource.count({
        where: { userId: alice.id, mediaId: media.id },
      }),
    ).toBe(3);
  });

  it("a trava é por usuário: dois usuários têm cada um a sua fonte ativa", async () =>
  {
    const alice = await semearUsuario("alice");
    const bob = await semearUsuario("bob");
    const media = await semearMedia(1);
    const prisma = getPrisma();

    await prisma.readingSource.create({ data: fonte(alice.id, media.id, true) });
    await prisma.readingSource.create({ data: fonte(bob.id, media.id, true) });

    expect(await prisma.readingSource.count({ where: { isActive: true } })).toBe(2);
  });
});
