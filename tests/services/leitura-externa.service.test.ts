import { describe, expect, it, vi } from "vitest";
import type { StatusDaEstante } from "@/server/domain/perfil";
import { registrarLeituraExterna } from "@/server/services/leitura-externa.service";

// A leitura que a extensão (issue #52) registra: o usuário está NA página do
// capítulo, num site sem template. Diferença para `abrirCapitulo`: aqui não
// existe fonte configurada e a URL não nasce no servidor — ela é a aba aberta.
// O que NÃO muda é a regra do progresso: o maior capítulo manda, releitura vira
// histórico e não regride a estante.

const URL_REAL = "https://mangafire.to/title/4mx-vagabondd/chapter/4745884";

function fakeDeps(cenario: {
  entrada?: { mediaId: string } | null;
  status?: StatusDaEstante;
  maior?: number | null;
  /** O capítulo marcado à mão na estante (#31/#61); ausente = nunca editado. */
  progressChapter?: string;
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
  const maiorCapitulo = vi.fn(async function ()
  {
    return cenario.maior ?? null;
  });
  const registrarComProgresso = vi.fn(async function () { return { id: "p1" }; });
  const registrarReleitura = vi.fn(async function () { return { id: "p2" }; });

  return {
    deps: { buscarEntrada, maiorCapitulo, registrarComProgresso, registrarReleitura },
    buscarEntrada,
    maiorCapitulo,
    registrarComProgresso,
    registrarReleitura,
  };
}

function pedido(extra: Partial<{ capitulo: number; urlVisitada: string }> = {})
{
  return {
    userId: "u1",
    entradaId: "e1",
    capitulo: 2,
    urlVisitada: URL_REAL,
    ...extra,
  };
}

// #61 vale aqui também: o progresso atual é o maior entre o capítulo marcado à
// mão e o histórico. Registrar pela extensão um capítulo abaixo do marcado não
// pode regredir a estante.
describe("registrarLeituraExterna — estante editada à mão", function ()
{
  it("capítulo abaixo do marcado vira histórico e o progresso fica no marcado", async function ()
  {
    const { deps, registrarComProgresso, registrarReleitura } = fakeDeps({
      maior: null,
      progressChapter: "100",
    });

    const resultado = await registrarLeituraExterna(pedido({ capitulo: 3 }), deps);

    expect(resultado).toMatchObject({ estado: "ok", capitulo: 3, progresso: 100 });
    expect(registrarReleitura).toHaveBeenCalledOnce();
    expect(registrarComProgresso).not.toHaveBeenCalled();
  });

  it("capítulo acima do marcado avança, mesmo com histórico menor", async function ()
  {
    const { deps, registrarComProgresso } = fakeDeps({ maior: 50, progressChapter: "100" });

    const resultado = await registrarLeituraExterna(pedido({ capitulo: 101 }), deps);

    expect(resultado).toMatchObject({ estado: "ok", capitulo: 101, progresso: 101 });
    expect(registrarComProgresso).toHaveBeenCalledWith(
      expect.objectContaining({ chapter: 101, novoProgresso: 101 }),
    );
  });
});

describe("registrarLeituraExterna", function ()
{
  it("capítulo novo avança o progresso da estante", async function ()
  {
    const { deps, registrarComProgresso, registrarReleitura } = fakeDeps({ maior: 1 });

    const resultado = await registrarLeituraExterna(pedido({ capitulo: 2 }), deps);

    expect(resultado).toEqual({
      estado: "ok",
      capitulo: 2,
      progresso: 2,
      url: URL_REAL,
    });
    expect(registrarComProgresso).toHaveBeenCalledTimes(1);
    expect(registrarReleitura).not.toHaveBeenCalled();
  });

  it("primeira leitura da obra progride", async function ()
  {
    const { deps, registrarComProgresso } = fakeDeps({ maior: null });

    const resultado = await registrarLeituraExterna(pedido({ capitulo: 1 }), deps);

    expect(resultado).toMatchObject({ estado: "ok", progresso: 1 });
    expect(registrarComProgresso).toHaveBeenCalledTimes(1);
  });

  it("releitura entra no histórico sem regredir a estante", async function ()
  {
    const { deps, registrarComProgresso, registrarReleitura } = fakeDeps({ maior: 57.5 });

    const resultado = await registrarLeituraExterna(pedido({ capitulo: 12 }), deps);

    expect(resultado).toMatchObject({ estado: "ok", capitulo: 12, progresso: 57.5 });
    expect(registrarReleitura).toHaveBeenCalledTimes(1);
    expect(registrarComProgresso).not.toHaveBeenCalled();
  });

  it("grava a URL da aba, sem fonte: é o caso do site sem template", async function ()
  {
    const { deps, registrarComProgresso } = fakeDeps({ maior: null });

    await registrarLeituraExterna(pedido({ capitulo: 2 }), deps);

    // Objeto exato de propósito: é isto que prova que nenhum `readingSourceId`
    // foi inventado para uma leitura que não tem fonte configurada.
    expect(registrarComProgresso).toHaveBeenCalledWith({
      userId: "u1",
      mediaId: "m1",
      chapter: 2,
      resolvedUrl: URL_REAL,
      novoProgresso: 2,
    });
  });

  it("normaliza o capítulo digitado às casas que a coluna guarda", async function ()
  {
    const { deps, registrarComProgresso } = fakeDeps({ maior: null });

    const resultado = await registrarLeituraExterna(pedido({ capitulo: 57.567 }), deps);

    expect(resultado).toMatchObject({ estado: "ok", capitulo: 57.57 });
    expect(registrarComProgresso).toHaveBeenCalledWith(
      expect.objectContaining({ chapter: 57.57 }),
    );
  });

  it("obra planejada passa a lendo: é o caso de começar pela extensão", async function ()
  {
    const { deps, registrarComProgresso } = fakeDeps({ status: "PLANNED", maior: null });

    await registrarLeituraExterna(pedido({ capitulo: 1 }), deps);

    expect(registrarComProgresso).toHaveBeenCalledWith(
      expect.objectContaining({ novoStatus: "READING" }),
    );
  });

  it("obra pausada volta a lendo mesmo quando é releitura", async function ()
  {
    // O status muda porque a pessoa voltou a ler, não porque o progresso andou.
    const { deps, registrarReleitura } = fakeDeps({ status: "PAUSED", maior: 57.5 });

    await registrarLeituraExterna(pedido({ capitulo: 12 }), deps);

    expect(registrarReleitura).toHaveBeenCalledWith(
      expect.objectContaining({ novoStatus: "READING" }),
    );
  });

  it("quem já está lendo não recebe mudança de status", async function ()
  {
    const { deps, registrarComProgresso } = fakeDeps({ status: "READING", maior: null });

    await registrarLeituraExterna(pedido({ capitulo: 1 }), deps);

    expect(registrarComProgresso).toHaveBeenCalledWith(
      expect.not.objectContaining({ novoStatus: expect.anything() }),
    );
  });

  it("registrar em obra concluída não a desmarca", async function ()
  {
    const { deps, registrarReleitura } = fakeDeps({ status: "COMPLETED", maior: 100 });

    await registrarLeituraExterna(pedido({ capitulo: 12 }), deps);

    expect(registrarReleitura).toHaveBeenCalledWith(
      expect.not.objectContaining({ novoStatus: expect.anything() }),
    );
  });

  it("procura a entrada sempre pelo dono da sessão", async function ()
  {
    const { deps, buscarEntrada } = fakeDeps({});

    await registrarLeituraExterna(pedido(), deps);

    expect(buscarEntrada).toHaveBeenCalledWith("u1", "e1");
  });

  it("entrada de outro usuário não é encontrada e nada é gravado", async function ()
  {
    const { deps, registrarComProgresso, registrarReleitura } = fakeDeps({ entrada: null });

    const resultado = await registrarLeituraExterna(pedido(), deps);

    expect(resultado).toEqual({ estado: "nao_encontrada" });
    expect(registrarComProgresso).not.toHaveBeenCalled();
    expect(registrarReleitura).not.toHaveBeenCalled();
  });

  it("URL fora de http(s) é recusada antes de tocar no banco", async function ()
  {
    const { deps, buscarEntrada, registrarComProgresso } = fakeDeps({});

    const resultado = await registrarLeituraExterna(
      pedido({ urlVisitada: "javascript:alert(1)" }),
      deps,
    );

    expect(resultado).toEqual({ estado: "url_invalida" });
    expect(buscarEntrada).not.toHaveBeenCalled();
    expect(registrarComProgresso).not.toHaveBeenCalled();
  });

  it("capítulo fora do contrato é recusado antes de tocar no banco", async function ()
  {
    const { deps, buscarEntrada, registrarComProgresso } = fakeDeps({});

    const resultado = await registrarLeituraExterna(pedido({ capitulo: 0 }), deps);

    expect(resultado).toEqual({ estado: "capitulo_invalido" });
    expect(buscarEntrada).not.toHaveBeenCalled();
    expect(registrarComProgresso).not.toHaveBeenCalled();
  });
});
