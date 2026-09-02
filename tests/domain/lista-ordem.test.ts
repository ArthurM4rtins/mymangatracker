import { describe, expect, it } from "vitest";
import { mesmoConjunto, mover } from "@/server/domain/lista-ordem";

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
