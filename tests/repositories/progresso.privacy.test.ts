import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "@/server/repositories/prisma";
import { salvarMediaDoAniList } from "@/server/repositories/media.repository";
import {
  adicionarOuAtualizarEntrada,
  buscarEntradaDoUsuario,
  listarEntradasDoUsuario,
} from "@/server/repositories/shelf.repository";
import {
  buscarFonteAtiva,
  listarFontesAtivas,
  trocarFonteAtiva,
} from "@/server/repositories/reading-source.repository";
import {
  registrarAbertura,
  registrarAberturaComProgresso,
} from "@/server/repositories/reading-progress.repository";
import { limparBanco, semearUsuario } from "./apoio";

// As regras de banco da issue #23: ReadingSource e ReadingProgress são PRIVADOS
// DO DONO. Uma fonte ativa por (userId, mediaId); trocar preserva o histórico.
// Registrar abertura com novoProgresso atualiza a estante na mesma transação;
// releitura (sem novoProgresso) não regride nada.

const OBRA = {
  anilistId: 30013,
  type: "MANGA" as const,
  titleRomaji: "Vinland Saga",
  chapters: 224,
};

const FONTE = {
  sourceHost: "mangalivre.blog",
  urlTemplate: "/title/Vinland-Saga/chapter/{chapter}/1",
  confirmadaEm: new Date("2026-09-01T12:00:00Z"),
};

beforeEach(limparBanco);

async function semearEstante(username: string)
{
  const usuario = await semearUsuario(username);
  const media = await salvarMediaDoAniList(OBRA, new Date());
  const entrada = await adicionarOuAtualizarEntrada({
    userId: usuario.id,
    mediaId: media.id,
    status: "READING",
  });

  return { usuario, media, entrada };
}

describe("trocarFonteAtiva", function ()
{
  it("mantém UMA ativa e preserva o histórico ao trocar", async function ()
  {
    const { usuario, media } = await semearEstante("rankine");

    await trocarFonteAtiva({ userId: usuario.id, mediaId: media.id, ...FONTE });
    await trocarFonteAtiva({
      userId: usuario.id,
      mediaId: media.id,
      ...FONTE,
      sourceHost: "outrosite.com",
    });

    const todas = await getPrisma().readingSource.findMany({
      where: { userId: usuario.id, mediaId: media.id },
    });
    expect(todas).toHaveLength(2);
    expect(todas.filter(function (f) { return f.isActive; })).toHaveLength(1);

    const ativa = await buscarFonteAtiva(usuario.id, media.id);
    expect(ativa?.sourceHost).toBe("outrosite.com");
  });

  it("fonte de um usuário não aparece para outro", async function ()
  {
    const { usuario, media } = await semearEstante("dono");
    const outro = await semearUsuario("outro");

    await trocarFonteAtiva({ userId: usuario.id, mediaId: media.id, ...FONTE });

    await expect(buscarFonteAtiva(outro.id, media.id)).resolves.toBeNull();
    await expect(listarFontesAtivas(outro.id)).resolves.toEqual([]);
  });
});

describe("registrarAbertura", function ()
{
  it("com novoProgresso, grava histórico e avança a estante juntos", async function ()
  {
    const { usuario, media } = await semearEstante("rankine");
    const fonte = await trocarFonteAtiva({ userId: usuario.id, mediaId: media.id, ...FONTE });

    await registrarAberturaComProgresso({
      userId: usuario.id,
      mediaId: media.id,
      readingSourceId: fonte.id,
      chapter: 57.5,
      resolvedUrl: "https://mangalivre.blog/title/Vinland-Saga/chapter/57.5/1",
      novoProgresso: 57.5,
    });

    const [entrada] = await listarEntradasDoUsuario(usuario.id);
    expect(entrada.progressChapter).toBe("57.5");

    const historico = await getPrisma().readingProgress.findMany({
      where: { userId: usuario.id, mediaId: media.id },
    });
    expect(historico).toHaveLength(1);
    expect(historico[0].chapter.toString()).toBe("57.5");
  });

  it("releitura entra no histórico sem regredir a estante", async function ()
  {
    const { usuario, media } = await semearEstante("rankine");
    const fonte = await trocarFonteAtiva({ userId: usuario.id, mediaId: media.id, ...FONTE });

    await registrarAberturaComProgresso({
      userId: usuario.id,
      mediaId: media.id,
      readingSourceId: fonte.id,
      chapter: 57,
      resolvedUrl: "https://mangalivre.blog/title/Vinland-Saga/chapter/57/1",
      novoProgresso: 57,
    });
    await registrarAbertura({
      userId: usuario.id,
      mediaId: media.id,
      readingSourceId: fonte.id,
      chapter: 3,
      resolvedUrl: "https://mangalivre.blog/title/Vinland-Saga/chapter/3/1",
    });

    const [entrada] = await listarEntradasDoUsuario(usuario.id);
    expect(entrada.progressChapter).toBe("57");

    const historico = await getPrisma().readingProgress.count({
      where: { userId: usuario.id, mediaId: media.id },
    });
    expect(historico).toBe(2);
  });
});

describe("buscarEntradaDoUsuario", function ()
{
  it("entrada alheia responde igual à inexistente", async function ()
  {
    const { entrada } = await semearEstante("dono");
    const intruso = await semearUsuario("intruso");

    await expect(buscarEntradaDoUsuario(intruso.id, entrada.id)).resolves.toBeNull();
    await expect(buscarEntradaDoUsuario(intruso.id, "nao-existe")).resolves.toBeNull();
  });
});
