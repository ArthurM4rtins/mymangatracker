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
  anilistId: 30013,
  titleRomaji: "Vinland Saga",
  titleEnglish: null,
  titleNative: null,
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

// Total de aberturas por obra, para a confirmacao do reset (#172).
const contarAberturasPorObra = async function () { return [{ mediaId: "m1", total: 8 }]; };

// O ultimo link vem da extensao, nunca de fonte configurada (#170).
const MAIS_AVANCADA = {
  mediaId: "m1",
  resolvedUrl: "https://mangafire.to/title/qnlvj-vagabond22/chapter/7180252",
  chapter: "70",
};

describe("listarEstante", function ()
{
  it("compõe a entrada com a ultima leitura e a avaliação, sem vazar mediaId", async function ()
  {
    const listarEntradas = vi.fn(async function () { return [NO_REPOSITORIO]; });
    const listarLeiturasMaisAvancadas = vi.fn(async function () { return [MAIS_AVANCADA]; });
    const listarAvaliacoes = vi.fn(async function ()
    {
      return [
        { mediaId: "m1", rating: "4.5", review: "obra-prima", containsSpoilers: false },
      ];
    });

    const entradas = await listarEstante(
      { userId: "u1", status: "READING" },
      { listarEntradas, listarLeiturasMaisAvancadas, listarAvaliacoes, contarAberturasPorObra },
    );

    expect(listarEntradas).toHaveBeenCalledWith("u1", "READING");
    expect(listarLeiturasMaisAvancadas).toHaveBeenCalledWith("u1");
    expect(listarAvaliacoes).toHaveBeenCalledWith("u1");
    expect(entradas).toEqual([
      {
        entradaId: "e1",
        status: "READING",
        progressChapter: "57.5",
        obra: OBRA,
        continuarEm: {
          url: "https://mangafire.to/title/qnlvj-vagabond22/chapter/7180252",
          host: "mangafire.to",
          capitulo: "70",
        },
        avaliacao: { rating: "4.5", review: "obra-prima", containsSpoilers: false },
        totalDeAberturas: 8,
      } satisfies EntradaDaEstante,
    ]);
    expect(entradas[0]).not.toHaveProperty("mediaId");
  });

  it("o host sai da propria URL: e o que a tela mostra como 'lendo em'", async function ()
  {
    const listarEntradas = vi.fn(async function () { return [NO_REPOSITORIO]; });
    const listarLeiturasMaisAvancadas = vi.fn(async function ()
    {
      return [
        {
          mediaId: "m1",
          resolvedUrl: "https://mangadex.org/chapter/ff963efd-8ea1-44a3-90f6-bf743b1dbf59",
          chapter: "94",
        },
      ];
    });

    const entradas = await listarEstante(
      { userId: "u1" },
      { listarEntradas, listarLeiturasMaisAvancadas, listarAvaliacoes: vazio, contarAberturasPorObra: vazio },
    );

    expect(entradas[0].continuarEm).toEqual({
      url: "https://mangadex.org/chapter/ff963efd-8ea1-44a3-90f6-bf743b1dbf59",
      host: "mangadex.org",
      capitulo: "94",
    });
  });

  it("sem abertura registrada nem avaliação, ambos são null", async function ()
  {
    // Sem extensao ninguem registrou nada: a tela nao tem para onde continuar.
    const listarEntradas = vi.fn(async function ()
    {
      return [{ ...NO_REPOSITORIO, progressChapter: null }];
    });
    const listarLeiturasMaisAvancadas = vi.fn(async function () { return []; });

    const entradas = await listarEstante(
      { userId: "u1" },
      { listarEntradas, listarLeiturasMaisAvancadas, listarAvaliacoes: vazio, contarAberturasPorObra: vazio },
    );

    expect(listarEntradas).toHaveBeenCalledWith("u1", undefined);
    expect(entradas[0]).toMatchObject({ continuarEm: null, avaliacao: null, totalDeAberturas: 0 });
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

  it("capítulo com mais de duas casas é recusado — a coluna é Decimal(8,2)", async function ()
  {
    const atualizarProgresso = vi.fn(async function () { return { id: "e1" }; });

    const resultado = await definirProgresso(
      { userId: "u1", entradaId: "e1", capitulo: 12.345 },
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
