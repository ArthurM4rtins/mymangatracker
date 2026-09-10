import { describe, expect, it, vi } from "vitest";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import {
  removerAvaliacaoDaEntrada,
  salvarAvaliacaoDaEntrada,
} from "@/server/services/avaliacao.service";

// Issues #33 e #45: nota 0,5–5,0 em meia estrela (domínio decide); nota e
// resenha independentes, mas avaliação vazia não existe; avaliar NÃO exige a
// obra na estante — vale ter a obra no cache (a página dela já cacheou).

function fakeDeps(media: { id: string } | null = { id: "m1" })
{
  const buscarMedia = vi.fn(async function () { return media; });
  const salvar = vi.fn(async function () { return { id: "a1" }; });
  const remover = vi.fn(async function (): Promise<{ removida: true } | null>
  {
    return { removida: true };
  });

  const limitar = vi.fn(async function (): Promise<Veredito> { return { bloqueado: false }; });

  return {
    deps: { buscarMedia, salvar, remover, limitar },
    buscarMedia,
    salvar,
    remover,
    limitar,
  };
}

const PEDIDO = {
  userId: "u1",
  referencia: { fonte: "anilist" as const, id: 30002 },
  rating: 4.5 as number | null,
  review: "obra-prima" as string | null,
  containsSpoilers: false,
};

describe("salvarAvaliacaoDaEntrada", function ()
{
  it("salva nota e resenha pela obra, sem exigir estante", async function ()
  {
    const { deps, salvar } = fakeDeps();

    const resultado = await salvarAvaliacaoDaEntrada(PEDIDO, deps);

    expect(resultado).toEqual({ estado: "ok" });
    expect(salvar).toHaveBeenCalledWith({
      userId: "u1",
      mediaId: "m1",
      rating: 4.5,
      review: "obra-prima",
      containsSpoilers: false,
    });
  });

  it("só nota é válido; resenha em branco vira null", async function ()
  {
    const { deps, salvar } = fakeDeps();

    const resultado = await salvarAvaliacaoDaEntrada(
      { ...PEDIDO, review: "   " },
      deps,
    );

    expect(resultado).toEqual({ estado: "ok" });
    expect(salvar).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 4.5, review: null }),
    );
  });

  it("só resenha é válido", async function ()
  {
    const { deps } = fakeDeps();

    const resultado = await salvarAvaliacaoDaEntrada(
      { ...PEDIDO, rating: null },
      deps,
    );

    expect(resultado).toEqual({ estado: "ok" });
  });

  it("sem nota e sem resenha é inválido, sem tocar o banco", async function ()
  {
    const { deps, salvar } = fakeDeps();

    const resultado = await salvarAvaliacaoDaEntrada(
      { ...PEDIDO, rating: null, review: null },
      deps,
    );

    expect(resultado).toEqual({ estado: "avaliacao_invalida" });
    expect(salvar).not.toHaveBeenCalled();
  });

  it("nota fora da meia estrela é inválida, sem tocar o banco", async function ()
  {
    const { deps, salvar } = fakeDeps();

    const resultado = await salvarAvaliacaoDaEntrada(
      { ...PEDIDO, rating: 3.7 },
      deps,
    );

    expect(resultado).toEqual({ estado: "avaliacao_invalida" });
    expect(salvar).not.toHaveBeenCalled();
  });

  it("obra fora do cache é obra_desconhecida", async function ()
  {
    const { deps, salvar } = fakeDeps(null);

    const resultado = await salvarAvaliacaoDaEntrada(PEDIDO, deps);

    expect(resultado).toEqual({ estado: "obra_desconhecida" });
    expect(salvar).not.toHaveBeenCalled();
  });
});

describe("removerAvaliacaoDaEntrada", function ()
{
  it("remove a avaliação da obra", async function ()
  {
    const { deps, remover } = fakeDeps();

    const resultado = await removerAvaliacaoDaEntrada(
      { userId: "u1", referencia: { fonte: "anilist" as const, id: 30002 } },
      deps,
    );

    expect(resultado).toEqual({ estado: "ok" });
    expect(remover).toHaveBeenCalledWith("u1", "m1");
  });

  it("avaliação que não existe é nao_encontrada", async function ()
  {
    const { deps, remover } = fakeDeps();
    remover.mockResolvedValue(null);

    const resultado = await removerAvaliacaoDaEntrada(
      { userId: "u1", referencia: { fonte: "anilist" as const, id: 30002 } },
      deps,
    );

    expect(resultado).toEqual({ estado: "nao_encontrada" });
  });
});

// #143: a rota de avaliacao nao tinha teto nenhum, e era ela que o truque de
// apagar-e-reescrever repetia. A coluna carimbada uma vez fecha a regra; o teto
// e defesa em profundidade sobre a rota inteira.
describe("teto de avaliacoes por hora", function ()
{
  it("acima do teto, nao grava e diz quanto esperar", async function ()
  {
    const { deps, limitar, salvar } = fakeDeps();
    limitar.mockResolvedValue({ bloqueado: true, esperarSegundos: 90 });

    await expect(salvarAvaliacaoDaEntrada(PEDIDO, deps)).resolves.toEqual({
      estado: "muitos_pedidos",
      esperarSegundos: 90,
    });
    expect(salvar).not.toHaveBeenCalled();
  });

  it("o teto e por dono, e corre antes de tocar o banco", async function ()
  {
    const { deps, limitar, buscarMedia } = fakeDeps();
    limitar.mockResolvedValue({ bloqueado: true, esperarSegundos: 5 });

    await salvarAvaliacaoDaEntrada(PEDIDO, deps);

    expect(limitar).toHaveBeenCalledWith("u1");
    expect(buscarMedia).not.toHaveBeenCalled();
  });

  it("avaliacao invalida nem chega ao teto", async function ()
  {
    const { deps, limitar } = fakeDeps();

    await salvarAvaliacaoDaEntrada({ ...PEDIDO, rating: null, review: null }, deps);

    expect(limitar).not.toHaveBeenCalled();
  });
});
