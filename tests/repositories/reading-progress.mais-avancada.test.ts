import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  aberturaMaisAvancadaDaObra,
  listarAberturasMaisAvancadas,
  registrarAbertura,
} from "@/server/repositories/reading-progress.repository";
import { getPrisma } from "@/server/repositories/prisma";
import { limparBanco, semearMedia, semearUsuario } from "./apoio";

// O destino do "Continuar leitura" (#170) é o capítulo MAIS AVANÇADO, não a
// abertura mais recente: quem releu o 2 depois de chegar no 94 continua do 94.
// A ordenação é a regra aqui, e regra de ordenação só se prova no banco.

describe("abertura mais avançada", () =>
{
  beforeEach(async () =>
  {
    await limparBanco();
  });

  afterAll(async () =>
  {
    await getPrisma().$disconnect();
  });

  it("releitura recente não muda o destino: vale o maior capítulo", async () =>
  {
    const leitor = await semearUsuario("leitor");
    const media = await semearMedia(1);

    await registrarAbertura({
      userId: leitor.id,
      mediaId: media.id,
      chapter: 94,
      resolvedUrl: "https://mangadex.org/chapter/uuid-do-94",
    });
    await registrarAbertura({
      userId: leitor.id,
      mediaId: media.id,
      chapter: 2,
      resolvedUrl: "https://mangafire.to/title/obra/chapter/2",
    });

    expect(await aberturaMaisAvancadaDaObra(leitor.id, media.id)).toEqual({
      resolvedUrl: "https://mangadex.org/chapter/uuid-do-94",
      chapter: "94",
    });
  });

  it("capítulo decimal ordena por valor, não por texto", async () =>
  {
    const leitor = await semearUsuario("leitor");
    const media = await semearMedia(1);

    // Como texto, "9.5" vem depois de "57.5" — como número, não.
    await registrarAbertura({
      userId: leitor.id,
      mediaId: media.id,
      chapter: 57.5,
      resolvedUrl: "https://site.test/c/57.5",
    });
    await registrarAbertura({
      userId: leitor.id,
      mediaId: media.id,
      chapter: 9.5,
      resolvedUrl: "https://site.test/c/9.5",
    });

    expect((await aberturaMaisAvancadaDaObra(leitor.id, media.id))?.chapter).toBe("57.5");
  });

  it("mesmo capítulo aberto duas vezes: vale a URL mais recente", async () =>
  {
    const leitor = await semearUsuario("leitor");
    const media = await semearMedia(1);

    await registrarAbertura({
      userId: leitor.id,
      mediaId: media.id,
      chapter: 70,
      resolvedUrl: "https://site-antigo.test/c/70",
    });
    await registrarAbertura({
      userId: leitor.id,
      mediaId: media.id,
      chapter: 70,
      resolvedUrl: "https://site-novo.test/c/70",
    });

    expect((await aberturaMaisAvancadaDaObra(leitor.id, media.id))?.resolvedUrl)
      .toBe("https://site-novo.test/c/70");
  });

  it("uma linha por obra, e nunca a de outro usuário", async () =>
  {
    const alice = await semearUsuario("alice");
    const bob = await semearUsuario("bob");
    const berserk = await semearMedia(1);
    const vagabond = await semearMedia(2);

    await registrarAbertura({
      userId: alice.id,
      mediaId: berserk.id,
      chapter: 10,
      resolvedUrl: "https://site.test/berserk/10",
    });
    await registrarAbertura({
      userId: alice.id,
      mediaId: berserk.id,
      chapter: 3,
      resolvedUrl: "https://site.test/berserk/3",
    });
    await registrarAbertura({
      userId: alice.id,
      mediaId: vagabond.id,
      chapter: 94,
      resolvedUrl: "https://site.test/vagabond/94",
    });
    await registrarAbertura({
      userId: bob.id,
      mediaId: berserk.id,
      chapter: 999,
      resolvedUrl: "https://site.test/berserk/999",
    });

    const linhas = await listarAberturasMaisAvancadas(alice.id);

    expect(linhas).toHaveLength(2);
    expect(linhas.map(function (l) { return l.chapter; }).sort()).toEqual(["10", "94"]);
    expect(linhas.every(function (l) { return !l.resolvedUrl.includes("999"); })).toBe(true);
  });
});
