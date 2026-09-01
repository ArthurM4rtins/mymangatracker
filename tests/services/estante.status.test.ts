import { describe, expect, it, vi } from "vitest";
import {
  anilistIdsNaEstante,
  listarEstante,
  mudarStatusDaEntrada,
  type EntradaDaEstante,
} from "@/server/services/estante.service";

// As regras da issue #11: toda consulta carrega userId — a estante de um
// usuário nunca aparece para outro; entrada que não é do usuário não é
// encontrada (não "proibida": não revelamos que existe).

const OBRA = {
  titleRomaji: "Vinland Saga",
  titleEnglish: null,
  coverImageUrl: null,
  type: "MANGA" as const,
  countryOfOrigin: "JP",
  chapters: 224,
};

const NO_REPOSITORIO = {
  entradaId: "e1",
  mediaId: "m1",
  status: "READING" as const,
  progressChapter: "57.5",
  obra: OBRA,
};

const FONTE_ATIVA = {
  id: "f1",
  mediaId: "m1",
  sourceHost: "mangalivre.blog",
  urlTemplate: "/title/Vinland-Saga/chapter/{chapter}/1",
};

describe("listarEstante", function ()
{
  it("compõe a entrada com a fonte ativa e o próximo capítulo, sem vazar mediaId", async function ()
  {
    const listarEntradas = vi.fn(async function () { return [NO_REPOSITORIO]; });
    const listarFontes = vi.fn(async function () { return [FONTE_ATIVA]; });

    const entradas = await listarEstante(
      { userId: "u1", status: "READING" },
      { listarEntradas, listarFontes },
    );

    expect(listarEntradas).toHaveBeenCalledWith("u1", "READING");
    expect(listarFontes).toHaveBeenCalledWith("u1");
    expect(entradas).toEqual([
      {
        entradaId: "e1",
        status: "READING",
        progressChapter: "57.5",
        obra: OBRA,
        fonte: { sourceHost: "mangalivre.blog" },
        proximoCapitulo: 58,
      } satisfies EntradaDaEstante,
    ]);
    expect(entradas[0]).not.toHaveProperty("mediaId");
  });

  it("sem fonte configurada, fonte é null e o próximo capítulo é 1", async function ()
  {
    const listarEntradas = vi.fn(async function ()
    {
      return [{ ...NO_REPOSITORIO, progressChapter: null }];
    });
    const listarFontes = vi.fn(async function () { return []; });

    const entradas = await listarEstante({ userId: "u1" }, { listarEntradas, listarFontes });

    expect(listarEntradas).toHaveBeenCalledWith("u1", undefined);
    expect(entradas[0]).toMatchObject({ fonte: null, proximoCapitulo: 1 });
  });
});

describe("anilistIdsNaEstante", function ()
{
  it("delega ao repositório com o userId — o catálogo marca o que já está na estante", async function ()
  {
    const listarAnilistIds = vi.fn(async function () { return [30013, 30002]; });

    const ids = await anilistIdsNaEstante("u1", { listarAnilistIds });

    expect(listarAnilistIds).toHaveBeenCalledWith("u1");
    expect(ids).toEqual([30013, 30002]);
  });
});

describe("mudarStatusDaEntrada", function ()
{
  it("devolve ok quando a entrada é do usuário", async function ()
  {
    const atualizarStatus = vi.fn(async function () { return { id: "e1" }; });

    const resultado = await mudarStatusDaEntrada(
      { userId: "u1", entradaId: "e1", status: "COMPLETED" },
      { atualizarStatus },
    );

    expect(atualizarStatus).toHaveBeenCalledWith("u1", "e1", "COMPLETED");
    expect(resultado).toEqual({ estado: "ok" });
  });

  it("devolve nao_encontrada quando a entrada não existe ou é de outro usuário", async function ()
  {
    const atualizarStatus = vi.fn(async function () { return null; });

    const resultado = await mudarStatusDaEntrada(
      { userId: "u1", entradaId: "e-do-outro", status: "COMPLETED" },
      { atualizarStatus },
    );

    expect(resultado).toEqual({ estado: "nao_encontrada" });
  });
});
