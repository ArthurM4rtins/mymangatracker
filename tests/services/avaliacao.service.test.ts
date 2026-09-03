import { describe, expect, it, vi } from "vitest";
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

  return { deps: { buscarMedia, salvar, remover }, buscarMedia, salvar, remover };
}

const PEDIDO = {
  userId: "u1",
  anilistId: 30002,
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
      { userId: "u1", anilistId: 30002 },
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
      { userId: "u1", anilistId: 30002 },
      deps,
    );

    expect(resultado).toEqual({ estado: "nao_encontrada" });
  });
});
