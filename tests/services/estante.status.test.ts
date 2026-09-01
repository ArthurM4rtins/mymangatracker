import { describe, expect, it, vi } from "vitest";
import {
  anilistIdsNaEstante,
  definirProgresso,
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

const vazio = async function () { return []; };

const FONTE_ATIVA = {
  id: "f1",
  mediaId: "m1",
  sourceHost: "mangalivre.blog",
  urlTemplate: "/title/Vinland-Saga/chapter/{chapter}/1",
};

describe("listarEstante", function ()
{
  it("compõe a entrada com fonte, avaliação e próximo capítulo, sem vazar mediaId", async function ()
  {
    const listarEntradas = vi.fn(async function () { return [NO_REPOSITORIO]; });
    const listarFontes = vi.fn(async function () { return [FONTE_ATIVA]; });
    const listarAvaliacoes = vi.fn(async function ()
    {
      return [
        { mediaId: "m1", rating: "4.5", review: "obra-prima", containsSpoilers: false },
      ];
    });

    const entradas = await listarEstante(
      { userId: "u1", status: "READING" },
      { listarEntradas, listarFontes, listarAvaliacoes },
    );

    expect(listarEntradas).toHaveBeenCalledWith("u1", "READING");
    expect(listarFontes).toHaveBeenCalledWith("u1");
    expect(listarAvaliacoes).toHaveBeenCalledWith("u1");
    expect(entradas).toEqual([
      {
        entradaId: "e1",
        status: "READING",
        progressChapter: "57.5",
        obra: OBRA,
        fonte: { sourceHost: "mangalivre.blog", tipo: "template" },
        proximoCapitulo: 58,
        avaliacao: { rating: "4.5", review: "obra-prima", containsSpoilers: false },
      } satisfies EntradaDaEstante,
    ]);
    expect(entradas[0]).not.toHaveProperty("mediaId");
  });

  it("fonte de página da obra expõe a URL para a tela abrir direto", async function ()
  {
    const listarEntradas = vi.fn(async function () { return [NO_REPOSITORIO]; });
    const listarFontes = vi.fn(async function ()
    {
      return [
        {
          id: "f2",
          mediaId: "m1",
          sourceHost: "mangafire.to",
          urlTemplate: "/title/4mx-vagabondd",
        },
      ];
    });

    const entradas = await listarEstante(
      { userId: "u1" },
      { listarEntradas, listarFontes, listarAvaliacoes: vazio },
    );

    expect(entradas[0].fonte).toEqual({
      sourceHost: "mangafire.to",
      tipo: "pagina",
      urlDaObra: "https://mangafire.to/title/4mx-vagabondd",
    });
  });

  it("sem fonte nem avaliação, ambos são null e o próximo capítulo é 1", async function ()
  {
    const listarEntradas = vi.fn(async function ()
    {
      return [{ ...NO_REPOSITORIO, progressChapter: null }];
    });
    const listarFontes = vi.fn(async function () { return []; });

    const entradas = await listarEstante(
      { userId: "u1" },
      { listarEntradas, listarFontes, listarAvaliacoes: vazio },
    );

    expect(listarEntradas).toHaveBeenCalledWith("u1", undefined);
    expect(entradas[0]).toMatchObject({ fonte: null, avaliacao: null, proximoCapitulo: 1 });
  });
});

describe("definirProgresso", function ()
{
  // Edição manual é correção do dono: seta o capítulo direto, inclusive para
  // baixo. A regra do maior capítulo vale para ABERTURAS, não para edição.
  it("seta o capítulo da entrada do usuário, inclusive regredindo", async function ()
  {
    const atualizarProgresso = vi.fn(async function () { return { id: "e1" }; });

    const resultado = await definirProgresso(
      { userId: "u1", entradaId: "e1", capitulo: 12.5 },
      { atualizarProgresso },
    );

    expect(atualizarProgresso).toHaveBeenCalledWith("u1", "e1", 12.5);
    expect(resultado).toEqual({ estado: "ok" });
  });

  it("entrada alheia ou inexistente é nao_encontrada", async function ()
  {
    const atualizarProgresso = vi.fn(async function () { return null; });

    const resultado = await definirProgresso(
      { userId: "u1", entradaId: "e-do-outro", capitulo: 3 },
      { atualizarProgresso },
    );

    expect(resultado).toEqual({ estado: "nao_encontrada" });
  });

  it("capítulo não positivo é recusado sem tocar o banco", async function ()
  {
    const atualizarProgresso = vi.fn(async function () { return { id: "e1" }; });

    const resultado = await definirProgresso(
      { userId: "u1", entradaId: "e1", capitulo: 0 },
      { atualizarProgresso },
    );

    expect(resultado).toEqual({ estado: "capitulo_invalido" });
    expect(atualizarProgresso).not.toHaveBeenCalled();
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
