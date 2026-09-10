import { describe, expect, it } from "vitest";

import {
  emAndaresPelaLargura,
  LARGURA_ABERTA,
  larguraDaLombada,
  larguraDaVitrine,
  RECUO_DO_TRILHO,
  VAO,
  VITRINE_MINIMA,
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

// #229: com teto (a home pede nove), o andar tem de fechar com o número cheio.
// As lombadas variam de largura, então quem cede é o livro aberto — até o
// mínimo em que ele ainda é uma capa, não uma lombada.
describe("andar com teto fecha cheio", function ()
{
  it("todos os andares levam o teto, menos o último", function ()
  {
    const ids = Array.from({ length: 20 }, function (_, indice) { return indice + 1; });

    const andares = emAndaresPelaLargura(obras(ids), 637, 9);

    expect(andares.map(function (andar) { return andar.length; })).toEqual([9, 9, 2]);
  });

  it("a largura do livro aberto cede o que falta para o teto caber", function ()
  {
    // Nove com as lombadas mais largas possíveis: 8 × (56 + 4) = 480.
    const ids = [2, 2, 2, 2, 2, 2, 2, 2, 2];
    const largura = 2 * RECUO_DO_TRILHO + 480 + 130;

    const [andar] = emAndaresPelaLargura(obras(ids), largura, 9);

    expect(andar).toHaveLength(9);
    expect(larguraDaVitrine(andar, largura)).toBe(130);
  });

  it("nunca aperta o livro aberto além do mínimo", function ()
  {
    const ids = Array.from({ length: 9 }, function () { return 2; });

    expect(larguraDaVitrine(obras(ids), 300)).toBe(VITRINE_MINIMA);
  });

  it("sem teto, a vitrine fica na largura cheia", function ()
  {
    const ids = [1, 2, 3];

    expect(larguraDaVitrine(obras(ids), 900)).toBe(LARGURA_ABERTA);
  });

  it("teto que não cabe nem com a vitrine no mínimo: volta a encher pela largura", function ()
  {
    const ids = Array.from({ length: 12 }, function (_, indice) { return indice; });

    const andares = emAndaresPelaLargura(obras(ids), 260, 9);

    for (const andar of andares)
    {
      const ocupado = andar.reduce(function (soma, obra, indice)
      {
        return soma + (indice === 0 ? VITRINE_MINIMA : larguraDaLombada(obra.id) + VAO);
      }, 0);

      expect(ocupado).toBeLessThanOrEqual(260 - 2 * RECUO_DO_TRILHO);
    }
  });
});
