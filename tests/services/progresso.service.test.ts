import { describe, expect, it, vi } from "vitest";
import { abrirCapitulo } from "@/server/services/progresso.service";

// As regras da issue #23: sem capítulo pedido, abre o próximo (inteiro seguinte
// ao maior lido). Releitura entra no histórico sem regredir o progresso. Sem
// fonte configurada não há o que abrir. Entrada alheia = não encontrada.

const FONTE = {
  id: "f1",
  sourceHost: "mangalivre.blog",
  urlTemplate: "/title/Lookism/chapter/{chapter}/1",
};

function fakeDeps(cenario: {
  entrada?: { mediaId: string } | null;
  fonte?: typeof FONTE | null;
  maior?: number | null;
})
{
  const buscarEntrada = vi.fn(async function ()
  {
    const entrada = cenario.entrada === undefined ? { mediaId: "m1" } : cenario.entrada;
    return entrada === null
      ? null
      : { entradaId: "e1", mediaId: entrada.mediaId, progressChapter: null };
  });
  const buscarFonte = vi.fn(async function ()
  {
    return cenario.fonte === undefined ? FONTE : cenario.fonte;
  });
  const maiorCapitulo = vi.fn(async function ()
  {
    return cenario.maior ?? null;
  });
  const registrarComProgresso = vi.fn(async function () { return { id: "p1" }; });
  const registrarReleitura = vi.fn(async function () { return { id: "p2" }; });

  return {
    deps: {
      buscarEntrada,
      buscarFonte,
      maiorCapitulo,
      registrarComProgresso,
      registrarReleitura,
    },
    buscarEntrada,
    buscarFonte,
    maiorCapitulo,
    registrarComProgresso,
    registrarReleitura,
  };
}

describe("abrirCapitulo", function ()
{
  it("sem capítulo pedido, abre o próximo e avança o progresso", async function ()
  {
    const { deps, registrarComProgresso, registrarReleitura } = fakeDeps({ maior: 57.5 });

    const resultado = await abrirCapitulo({ userId: "u1", entradaId: "e1" }, deps);

    expect(resultado).toEqual({
      estado: "ok",
      capitulo: 58,
      progresso: 58,
      url: "https://mangalivre.blog/title/Lookism/chapter/58/1",
    });
    expect(registrarComProgresso).toHaveBeenCalledWith({
      userId: "u1",
      mediaId: "m1",
      readingSourceId: "f1",
      chapter: 58,
      resolvedUrl: "https://mangalivre.blog/title/Lookism/chapter/58/1",
      novoProgresso: 58,
    });
    expect(registrarReleitura).not.toHaveBeenCalled();
  });

  it("primeira leitura começa no capítulo 1", async function ()
  {
    const { deps } = fakeDeps({ maior: null });

    const resultado = await abrirCapitulo({ userId: "u1", entradaId: "e1" }, deps);

    expect(resultado).toMatchObject({ estado: "ok", capitulo: 1, progresso: 1 });
  });

  it("releitura registra histórico sem regredir o progresso", async function ()
  {
    const { deps, registrarComProgresso, registrarReleitura } = fakeDeps({ maior: 57 });

    const resultado = await abrirCapitulo(
      { userId: "u1", entradaId: "e1", capitulo: 3 },
      deps,
    );

    expect(resultado).toMatchObject({ estado: "ok", capitulo: 3, progresso: 57 });
    expect(registrarReleitura).toHaveBeenCalledWith({
      userId: "u1",
      mediaId: "m1",
      readingSourceId: "f1",
      chapter: 3,
      resolvedUrl: "https://mangalivre.blog/title/Lookism/chapter/3/1",
    });
    expect(registrarComProgresso).not.toHaveBeenCalled();
  });

  it("capítulo decimal pedido à mão funciona", async function ()
  {
    const { deps } = fakeDeps({ maior: 57 });

    const resultado = await abrirCapitulo(
      { userId: "u1", entradaId: "e1", capitulo: 57.5 },
      deps,
    );

    expect(resultado).toMatchObject({
      estado: "ok",
      capitulo: 57.5,
      progresso: 57.5,
      url: "https://mangalivre.blog/title/Lookism/chapter/57.5/1",
    });
  });

  it("sem fonte configurada não há o que abrir", async function ()
  {
    const { deps, registrarComProgresso } = fakeDeps({ fonte: null });

    const resultado = await abrirCapitulo({ userId: "u1", entradaId: "e1" }, deps);

    expect(resultado).toEqual({ estado: "sem_fonte" });
    expect(registrarComProgresso).not.toHaveBeenCalled();
  });

  it("entrada alheia ou inexistente é nao_encontrada", async function ()
  {
    const { deps, buscarFonte } = fakeDeps({ entrada: null });

    const resultado = await abrirCapitulo({ userId: "u1", entradaId: "e1" }, deps);

    expect(resultado).toEqual({ estado: "nao_encontrada" });
    expect(buscarFonte).not.toHaveBeenCalled();
  });

  it("fonte de página da obra abre a página e registra o capítulo igual", async function ()
  {
    const { deps, registrarComProgresso } = fakeDeps({
      maior: 57,
      fonte: { id: "f2", sourceHost: "mangafire.to", urlTemplate: "/title/4mx-vagabondd" },
    });

    const resultado = await abrirCapitulo({ userId: "u1", entradaId: "e1" }, deps);

    expect(resultado).toEqual({
      estado: "ok",
      capitulo: 58,
      progresso: 58,
      url: "https://mangafire.to/title/4mx-vagabondd",
    });
    expect(registrarComProgresso).toHaveBeenCalledWith({
      userId: "u1",
      mediaId: "m1",
      readingSourceId: "f2",
      chapter: 58,
      resolvedUrl: "https://mangafire.to/title/4mx-vagabondd",
      novoProgresso: 58,
    });
  });

  it("capítulo não positivo é recusado sem tocar o banco", async function ()
  {
    const { deps, registrarComProgresso, registrarReleitura } = fakeDeps({});

    const resultado = await abrirCapitulo(
      { userId: "u1", entradaId: "e1", capitulo: 0 },
      deps,
    );

    expect(resultado).toEqual({ estado: "capitulo_invalido" });
    expect(registrarComProgresso).not.toHaveBeenCalled();
    expect(registrarReleitura).not.toHaveBeenCalled();
  });
});
