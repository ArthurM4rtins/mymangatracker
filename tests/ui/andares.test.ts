import { describe, expect, it } from "vitest";

import {
  emAndaresPelaLargura,
  LARGURA_ABERTA,
  larguraDaLombada,
  RECUO_DO_TRILHO,
  VAO,
} from "@/app/(ui)/[locale]/componentes/andares";

function obras(ids: number[])
{
  return ids.map(function (id) { return { id }; });
}

/** Quanto um andar ocupa: o primeiro aberto, os demais de lombada, com os vãos. */
function ocupado(ids: number[])
{
  return ids.reduce(function (soma, id, indice)
  {
    return soma + (indice === 0 ? LARGURA_ABERTA : larguraDaLombada(id) + VAO);
  }, 0);
}

describe("emAndaresPelaLargura", function ()
{
  it("enche cada andar até a largura do trilho e passa o resto para o próximo", function ()
  {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const largura = 2 * RECUO_DO_TRILHO + ocupado([1, 2, 3, 4, 5]);

    const andares = emAndaresPelaLargura(obras(ids), largura);

    expect(andares.map(function (andar) { return andar.map(function (obra) { return obra.id; }); }))
      .toEqual([[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12]]);
  });

  it("nenhum andar passa da largura útil", function ()
  {
    const ids = Array.from({ length: 40 }, function (_, indice) { return indice * 7; });
    const largura = 650;

    for (const andar of emAndaresPelaLargura(obras(ids), largura))
    {
      expect(ocupado(andar.map(function (obra) { return obra.id; }))).toBeLessThanOrEqual(largura - 2 * RECUO_DO_TRILHO);
    }
  });

  it("respeita o teto por andar mesmo com largura de sobra", function ()
  {
    const andares = emAndaresPelaLargura(obras([1, 2, 3, 4, 5, 6, 7]), 10_000, 3);

    expect(andares.map(function (andar) { return andar.length; })).toEqual([3, 3, 1]);
  });

  it("sem largura medida ainda, um andar só (até o teto)", function ()
  {
    expect(emAndaresPelaLargura(obras([1, 2, 3]), 0)).toEqual([obras([1, 2, 3])]);
    expect(emAndaresPelaLargura(obras([1, 2, 3]), 0, 2).map(function (andar) { return andar.length; })).toEqual([2, 1]);
  });

  it("um livro sempre cabe, mesmo num trilho estreito demais", function ()
  {
    expect(emAndaresPelaLargura(obras([1, 2]), 50).map(function (andar) { return andar.length; })).toEqual([1, 1]);
  });

  it("lista vazia não gera andar", function ()
  {
    expect(emAndaresPelaLargura([], 900)).toEqual([]);
  });
});
