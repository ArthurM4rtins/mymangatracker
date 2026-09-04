import { describe, expect, it, vi } from "vitest";
import type { StatusDaEstante } from "@/server/domain/perfil";
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
  /** O capítulo marcado à mão na estante (#31); ausente = nunca editado. */
  progressChapter?: string;
  status?: StatusDaEstante;
})
{
  const buscarEntrada = vi.fn(async function ()
  {
    const entrada = cenario.entrada === undefined ? { mediaId: "m1" } : cenario.entrada;
    return entrada === null
      ? null
      : {
          entradaId: "e1",
          mediaId: entrada.mediaId,
          progressChapter: cenario.progressChapter ?? null,
          status: cenario.status ?? ("READING" as StatusDaEstante),
        };
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
  // A mesma regra do domínio que a extensão usa (issue #52): abrir capítulo diz
  // que a pessoa está lendo. A divergência entre os dois caminhos seria pior que
  // o problema, então a promoção vale aqui também.
  it("obra planejada passa a lendo ao abrir o capítulo", async function ()
  {
    const { deps, registrarComProgresso } = fakeDeps({ status: "PLANNED", maior: null });

    await abrirCapitulo({ userId: "u1", entradaId: "e1" }, deps);

    expect(registrarComProgresso).toHaveBeenCalledWith(
      expect.objectContaining({ novoStatus: "READING" }),
    );
  });

  it("releitura de obra pausada volta a lendo", async function ()
  {
    const { deps, registrarReleitura } = fakeDeps({ status: "PAUSED", maior: 57.5 });

    await abrirCapitulo({ userId: "u1", entradaId: "e1", capitulo: 12 }, deps);

    expect(registrarReleitura).toHaveBeenCalledWith(
      expect.objectContaining({ novoStatus: "READING" }),
    );
  });

  it("abrir capítulo de obra concluída não a desmarca", async function ()
  {
    const { deps, registrarReleitura } = fakeDeps({ status: "COMPLETED", maior: 100 });

    await abrirCapitulo({ userId: "u1", entradaId: "e1", capitulo: 12 }, deps);

    expect(registrarReleitura).toHaveBeenCalledWith(
      expect.not.objectContaining({ novoStatus: expect.anything() }),
    );
  });

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

  it("capítulo com mais de duas casas é recusado sem tocar o banco", async function ()
  {
    const { deps, registrarComProgresso, registrarReleitura } = fakeDeps({});

    const resultado = await abrirCapitulo(
      { userId: "u1", entradaId: "e1", capitulo: 57.555 },
      deps,
    );

    expect(resultado).toEqual({ estado: "capitulo_invalido" });
    expect(registrarComProgresso).not.toHaveBeenCalled();
    expect(registrarReleitura).not.toHaveBeenCalled();
  });

  // Issue #61: o capítulo marcado à mão na estante conta como progresso. O
  // card promete "Continuar cap. 101" a partir dele — o clique tem que abrir
  // o 101, e nunca regredir a estante para o que o histórico diz.
  describe("estante editada à mão", function ()
  {
    it("sem histórico, abre o seguinte ao marcado e não regride", async function ()
    {
      const { deps, registrarComProgresso } = fakeDeps({ maior: null, progressChapter: "100" });

      const resultado = await abrirCapitulo({ userId: "u1", entradaId: "e1" }, deps);

      expect(resultado).toEqual({
        estado: "ok",
        capitulo: 101,
        progresso: 101,
        url: "https://mangalivre.blog/title/Lookism/chapter/101/1",
      });
      expect(registrarComProgresso).toHaveBeenCalledWith(
        expect.objectContaining({ chapter: 101, novoProgresso: 101 }),
      );
    });

    it("histórico menor que o marcado à mão não manda", async function ()
    {
      const { deps } = fakeDeps({ maior: 50, progressChapter: "100" });

      const resultado = await abrirCapitulo({ userId: "u1", entradaId: "e1" }, deps);

      expect(resultado).toMatchObject({ estado: "ok", capitulo: 101, progresso: 101 });
    });

    it("histórico maior que o marcado à mão continua mandando", async function ()
    {
      const { deps } = fakeDeps({ maior: 100, progressChapter: "50" });

      const resultado = await abrirCapitulo({ userId: "u1", entradaId: "e1" }, deps);

      expect(resultado).toMatchObject({ estado: "ok", capitulo: 101, progresso: 101 });
    });

    it("marcado 57.5 à mão abre o 58", async function ()
    {
      const { deps } = fakeDeps({ maior: null, progressChapter: "57.5" });

      const resultado = await abrirCapitulo({ userId: "u1", entradaId: "e1" }, deps);

      expect(resultado).toMatchObject({ estado: "ok", capitulo: 58, progresso: 58 });
    });

    it("releitura abaixo do marcado à mão vira histórico sem regredir", async function ()
    {
      const { deps, registrarComProgresso, registrarReleitura } = fakeDeps({
        maior: null,
        progressChapter: "100",
      });

      const resultado = await abrirCapitulo(
        { userId: "u1", entradaId: "e1", capitulo: 3 },
        deps,
      );

      expect(resultado).toMatchObject({ estado: "ok", capitulo: 3, progresso: 100 });
      expect(registrarReleitura).toHaveBeenCalledOnce();
      expect(registrarComProgresso).not.toHaveBeenCalled();
    });
  });
});
