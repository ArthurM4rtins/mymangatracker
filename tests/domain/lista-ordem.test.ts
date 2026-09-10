import { describe, expect, it } from "vitest";
import { mesmoConjunto, mover, reposicionar } from "@/server/domain/lista-ordem";

// Reordenar (issue #51): a ordem proposta tem que ser permutação exata dos
// itens atuais — sem faltar, sem sobrar, sem repetir. `mover` é a regra pura
// que a tela usa pra montar a proposta a partir de uma seta.

describe("mesmoConjunto", function ()
{
  it("aceita permutação exata", function ()
  {
    expect(mesmoConjunto([1, 2, 3], [3, 1, 2])).toBe(true);
    expect(mesmoConjunto([], [])).toBe(true);
  });

  it("recusa item faltando, sobrando ou repetido", function ()
  {
    expect(mesmoConjunto([1, 2, 3], [1, 2])).toBe(false);
    expect(mesmoConjunto([1, 2, 3], [1, 2, 3, 4])).toBe(false);
    expect(mesmoConjunto([1, 2, 3], [1, 1, 2])).toBe(false);
    expect(mesmoConjunto([1, 2], [1, 1])).toBe(false);
  });
});

describe("mover", function ()
{
  it("sobe e desce trocando com o vizinho, sem alterar a entrada", function ()
  {
    const ordem = [1, 2, 3];

    expect(mover(ordem, 3, "cima")).toEqual([1, 3, 2]);
    expect(mover(ordem, 1, "baixo")).toEqual([2, 1, 3]);
    expect(ordem).toEqual([1, 2, 3]);
  });

  it("nas pontas e com item desconhecido devolve a mesma ordem", function ()
  {
    expect(mover([1, 2, 3], 1, "cima")).toEqual([1, 2, 3]);
    expect(mover([1, 2, 3], 3, "baixo")).toEqual([1, 2, 3]);
    expect(mover([1, 2, 3], 9, "cima")).toEqual([1, 2, 3]);
  });
});

// Arrastar (#242): a seta troca com o vizinho, o arraste leva o livro para uma
// posição qualquer. O destino é o índice que a obra passa a ocupar na ordem
// final, contado DEPOIS de tirar a obra do lugar de origem — é assim que o que
// se vê durante o arraste (a vaga aberta) bate com o que se grava.
describe("reposicionar", function ()
{
  it("leva o item para o índice pedido, para tras e para frente", function ()
  {
    expect(reposicionar([1, 2, 3, 4], 4, 1)).toEqual([1, 4, 2, 3]);
    expect(reposicionar([1, 2, 3, 4], 1, 2)).toEqual([2, 3, 1, 4]);
  });

  it("destino nas pontas leva para o comeco e para o fim", function ()
  {
    expect(reposicionar([1, 2, 3], 3, 0)).toEqual([3, 1, 2]);
    expect(reposicionar([1, 2, 3], 1, 2)).toEqual([2, 3, 1]);
  });

  it("destino igual a origem devolve a mesma ordem", function ()
  {
    expect(reposicionar([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });

  it("destino fora da faixa gruda na ponta, em vez de sumir com o item", function ()
  {
    expect(reposicionar([1, 2, 3], 1, 99)).toEqual([2, 3, 1]);
    expect(reposicionar([1, 2, 3], 3, -5)).toEqual([3, 1, 2]);
  });

  it("item desconhecido devolve a ordem intacta", function ()
  {
    expect(reposicionar([1, 2, 3], 9, 0)).toEqual([1, 2, 3]);
  });

  it("nao altera o array recebido", function ()
  {
    const ordem = [1, 2, 3];
    reposicionar(ordem, 3, 0);
    expect(ordem).toEqual([1, 2, 3]);
  });

  it("a saida e sempre permutacao exata da entrada", function ()
  {
    const ordem = [10, 20, 30, 40, 50];
    for (let destino = 0; destino < ordem.length; destino++)
    {
      expect(mesmoConjunto(ordem, reposicionar(ordem, 30, destino))).toBe(true);
    }
  });
});
