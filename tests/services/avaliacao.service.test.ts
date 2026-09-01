import { describe, expect, it, vi } from "vitest";
import {
  removerAvaliacaoDaEntrada,
  salvarAvaliacaoDaEntrada,
} from "@/server/services/avaliacao.service";

// As regras da issue #33: nota 0,5–5,0 em meia estrela (domínio decide);
// nota e resenha independentes, mas avaliação vazia não existe; entrada
// alheia responde igual à inexistente.

const ENTRADA = { entradaId: "e1", mediaId: "m1", progressChapter: null };

function fakeDeps(entrada: typeof ENTRADA | null = ENTRADA)
{
  const buscarEntrada = vi.fn(async function () { return entrada; });
  const salvar = vi.fn(async function () { return { id: "a1" }; });
  const remover = vi.fn(async function (): Promise<{ removida: true } | null>
  {
    return { removida: true };
  });

  return { deps: { buscarEntrada, salvar, remover }, buscarEntrada, salvar, remover };
}

const PEDIDO = {
  userId: "u1",
  entradaId: "e1",
  rating: 4.5 as number | null,
  review: "obra-prima" as string | null,
  containsSpoilers: false,
};

describe("salvarAvaliacaoDaEntrada", function ()
{
  it("salva nota e resenha na obra da entrada", async function ()
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

  it("entrada alheia ou inexistente é nao_encontrada", async function ()
  {
    const { deps, salvar } = fakeDeps(null);

    const resultado = await salvarAvaliacaoDaEntrada(PEDIDO, deps);

    expect(resultado).toEqual({ estado: "nao_encontrada" });
    expect(salvar).not.toHaveBeenCalled();
  });
});

describe("removerAvaliacaoDaEntrada", function ()
{
  it("remove a avaliação da obra da entrada", async function ()
  {
    const { deps, remover } = fakeDeps();

    const resultado = await removerAvaliacaoDaEntrada(
      { userId: "u1", entradaId: "e1" },
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
      { userId: "u1", entradaId: "e1" },
      deps,
    );

    expect(resultado).toEqual({ estado: "nao_encontrada" });
  });
});
