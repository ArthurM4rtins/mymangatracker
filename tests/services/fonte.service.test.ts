import { describe, expect, it, vi } from "vitest";
import {
  candidatosDeFonte,
  confirmarFonte,
} from "@/server/services/fonte.service";

// As regras da issue #23: o usuário cola a URL do capítulo 1; os candidatos
// voltam com o link de exemplo do capítulo 2 para confirmar num clique. A
// confirmação valida o template e só grava em entrada do próprio usuário.

describe("candidatosDeFonte", function ()
{
  it("deriva candidatos com o exemplo do capítulo 2", function ()
  {
    const resultado = candidatosDeFonte(
      "https://mangalivre.blog/title/Lookism/chapter/1/1",
    );

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(resultado.candidatos[0]).toEqual({
      sourceHost: "mangalivre.blog",
      urlTemplate: "/title/Lookism/chapter/{chapter}/1",
      urlExemplo: "https://mangalivre.blog/title/Lookism/chapter/2/1",
    });
  });

  it("URL inválida vira estado, não exceção", function ()
  {
    expect(candidatosDeFonte("nada-de-url")).toEqual({ estado: "url_invalida" });
  });

  it("sempre oferece a própria URL como página da obra — fallback para site sem número no link", function ()
  {
    const resultado = candidatosDeFonte(
      "https://mangafire.to/title/4mx-vagabondd/chapter/4745883",
    );

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(resultado.paginaDaObra).toEqual({
      sourceHost: "mangafire.to",
      urlTemplate: "/title/4mx-vagabondd/chapter/4745883",
      urlExemplo: "https://mangafire.to/title/4mx-vagabondd/chapter/4745883",
    });
  });

  it("URL sem segmento 1 devolve lista vazia, mas ainda com a página da obra", function ()
  {
    const resultado = candidatosDeFonte("https://site.com/obra/capitulos");

    expect(resultado).toMatchObject({
      estado: "ok",
      candidatos: [],
      paginaDaObra: {
        sourceHost: "site.com",
        urlTemplate: "/obra/capitulos",
      },
    });
  });
});

describe("confirmarFonte", function ()
{
  const AGORA = new Date("2026-09-01T15:00:00Z");

  const PEDIDO = {
    userId: "u1",
    entradaId: "e1",
    sourceHost: "mangalivre.blog",
    urlTemplate: "/title/Lookism/chapter/{chapter}/1",
  };

  function fakeDeps(entrada: { mediaId: string } | null)
  {
    const buscarEntrada = vi.fn(async function ()
    {
      return entrada === null
        ? null
        : { entradaId: "e1", mediaId: entrada.mediaId, progressChapter: null };
    });
    const trocarFonte = vi.fn(async function () { return { id: "f1" }; });

    return {
      deps: { buscarEntrada, trocarFonte, relogio: function () { return AGORA; } },
      buscarEntrada,
      trocarFonte,
    };
  }

  it("grava a fonte da entrada do usuário", async function ()
  {
    const { deps, trocarFonte } = fakeDeps({ mediaId: "m1" });

    const resultado = await confirmarFonte(PEDIDO, deps);

    expect(resultado).toEqual({ estado: "ok" });
    expect(trocarFonte).toHaveBeenCalledWith({
      userId: "u1",
      mediaId: "m1",
      sourceHost: "mangalivre.blog",
      urlTemplate: "/title/Lookism/chapter/{chapter}/1",
      confirmadaEm: AGORA,
    });
  });

  it("entrada alheia ou inexistente é nao_encontrada", async function ()
  {
    const { deps, trocarFonte } = fakeDeps(null);

    const resultado = await confirmarFonte(PEDIDO, deps);

    expect(resultado).toEqual({ estado: "nao_encontrada" });
    expect(trocarFonte).not.toHaveBeenCalled();
  });

  it("path sem {chapter} é aceito como página da obra — MangaFire e afins", async function ()
  {
    const { deps, trocarFonte } = fakeDeps({ mediaId: "m1" });

    const resultado = await confirmarFonte(
      {
        ...PEDIDO,
        sourceHost: "mangafire.to",
        urlTemplate: "/title/4mx-vagabondd",
      },
      deps,
    );

    expect(resultado).toEqual({ estado: "ok" });
    expect(trocarFonte).toHaveBeenCalledWith({
      userId: "u1",
      mediaId: "m1",
      sourceHost: "mangafire.to",
      urlTemplate: "/title/4mx-vagabondd",
      confirmadaEm: AGORA,
    });
  });

  it("host torto continua recusado antes de tocar o banco", async function ()
  {
    const { deps, trocarFonte } = fakeDeps({ mediaId: "m1" });

    const resultado = await confirmarFonte(
      { ...PEDIDO, sourceHost: "https://site.com/x" },
      deps,
    );

    expect(resultado).toEqual({ estado: "template_invalido" });
    expect(trocarFonte).not.toHaveBeenCalled();
  });
});
