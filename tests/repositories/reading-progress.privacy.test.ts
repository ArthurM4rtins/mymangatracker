import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  maiorCapitulo,
  registrarAbertura,
  ultimaAbertura,
} from "@/server/repositories/reading-progress.repository";
import { getPrisma } from "@/server/repositories/prisma";
import { limparBanco, semearMedia, semearUsuario } from "./apoio";

describe("reading-progress: privacidade do dono", () =>
{
  beforeEach(async () =>
  {
    await limparBanco();
  });

  afterAll(async () =>
  {
    await getPrisma().$disconnect();
  });

  it("não devolve a última abertura de outro usuário", async () =>
  {
    const alice = await semearUsuario("alice");
    const bob = await semearUsuario("bob");
    const media = await semearMedia(1);

    await registrarAbertura({
      userId: bob.id,
      mediaId: media.id,
      chapter: 58,
      resolvedUrl: "https://site.test/title/Obra/chapter/58/1",
    });

    expect(await ultimaAbertura(alice.id, media.id)).toBeNull();
  });

  it("não devolve o maior capítulo de outro usuário", async () =>
  {
    const alice = await semearUsuario("alice");
    const bob = await semearUsuario("bob");
    const media = await semearMedia(1);

    await registrarAbertura({
      userId: bob.id,
      mediaId: media.id,
      chapter: 58,
      resolvedUrl: "https://site.test/title/Obra/chapter/58/1",
    });

    expect(await maiorCapitulo(alice.id, media.id)).toBeNull();
  });

  it("devolve a própria abertura", async () =>
  {
    const alice = await semearUsuario("alice");
    const media = await semearMedia(1);

    await registrarAbertura({
      userId: alice.id,
      mediaId: media.id,
      chapter: 57.5,
      resolvedUrl: "https://site.test/title/Obra/chapter/57.5/1",
    });

    const achado = await ultimaAbertura(alice.id, media.id);

    expect(achado).not.toBeNull();
    expect(Number(achado?.chapter)).toBe(57.5);
  });
});

describe("reading-progress: progresso é o maior capítulo", () =>
{
  beforeEach(async () =>
  {
    await limparBanco();
  });

  it("maiorCapitulo ignora a ordem de abertura", async () =>
  {
    const alice = await semearUsuario("alice");
    const media = await semearMedia(1);

    await registrarAbertura({
      userId: alice.id,
      mediaId: media.id,
      chapter: 60,
      resolvedUrl: "https://site.test/c/60",
    });
    await registrarAbertura({
      userId: alice.id,
      mediaId: media.id,
      chapter: 58,
      resolvedUrl: "https://site.test/c/58",
    });

    expect(Number(await maiorCapitulo(alice.id, media.id))).toBe(60);
    expect(Number((await ultimaAbertura(alice.id, media.id))?.chapter)).toBe(58);
  });

  it("separa o progresso por obra", async () =>
  {
    const alice = await semearUsuario("alice");
    const lookism = await semearMedia(1);
    const soloLeveling = await semearMedia(2);

    await registrarAbertura({
      userId: alice.id,
      mediaId: lookism.id,
      chapter: 60,
      resolvedUrl: "https://site.test/c/60",
    });

    expect(await maiorCapitulo(alice.id, soloLeveling.id)).toBeNull();
  });
});

describe("reading-progress: o histórico pertence à obra, não ao site", () =>
{
  beforeEach(async () =>
  {
    await limparBanco();
  });

  it("apagar a fonte preserva o progresso, com readingSourceId nulo", async () =>
  {
    const alice = await semearUsuario("alice");
    const media = await semearMedia(1);
    const prisma = getPrisma();

    const fonte = await prisma.readingSource.create({
      data: {
        userId: alice.id,
        mediaId: media.id,
        sourceHost: "site.test",
        urlTemplate: "/title/Obra/chapter/{chapter}/1",
      },
    });

    await registrarAbertura({
      userId: alice.id,
      mediaId: media.id,
      readingSourceId: fonte.id,
      chapter: 58,
      resolvedUrl: "https://site.test/title/Obra/chapter/58/1",
    });

    await prisma.readingSource.delete({ where: { id: fonte.id } });

    const achado = await ultimaAbertura(alice.id, media.id);

    expect(achado).not.toBeNull();
    expect(achado?.readingSourceId).toBeNull();
  });

  it("o banco recusa apagar Media que tenha progresso", async () =>
  {
    const alice = await semearUsuario("alice");
    const media = await semearMedia(1);

    await registrarAbertura({
      userId: alice.id,
      mediaId: media.id,
      chapter: 58,
      resolvedUrl: "https://site.test/c/58",
    });

    await expect(
      getPrisma().media.delete({ where: { id: media.id } }),
    ).rejects.toThrow();
  });
});
