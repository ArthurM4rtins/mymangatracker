import { describe, expect, it } from "vitest";

import {
  emAndaresDosGrupos,
  emAndaresPelaLargura,
  LARGURA_ABERTA,
  larguraDaLombada,
  larguraDaVitrine,
  RECUO_DO_TRILHO,
  VAO,
  VITRINE_MINIMA,
} from "@/app/(ui)/[locale]/componentes/andares";

function obras(ids: string[])
{
  return ids.map(function (id) { return { id }; });
}

/** Quanto um andar ocupa: o primeiro aberto, os demais de lombada, com os vãos. */
function ocupado(ids: string[])
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
    const ids = ["a:1", "a:2", "a:3", "a:4", "a:5", "a:6", "a:7", "a:8", "a:9", "a:10", "a:11", "a:12"];
    const largura = 2 * RECUO_DO_TRILHO + ocupado(["a:1", "a:2", "a:3", "a:4", "a:5"]);

    const andares = emAndaresPelaLargura(obras(ids), largura);

    expect(andares.map(function (andar) { return andar.map(function (obra) { return obra.id; }); }))
      .toEqual([["a:1", "a:2", "a:3", "a:4", "a:5"], ["a:6", "a:7", "a:8", "a:9", "a:10"], ["a:11", "a:12"]]);
  });

  it("nenhum andar passa da largura útil", function ()
  {
    const ids = Array.from({ length: 40 }, function (_, indice) { return "a:" + indice * 7; });
    const largura = 650;

    for (const andar of emAndaresPelaLargura(obras(ids), largura))
    {
      expect(ocupado(andar.map(function (obra) { return obra.id; }))).toBeLessThanOrEqual(largura - 2 * RECUO_DO_TRILHO);
    }
  });

  it("respeita o teto por andar mesmo com largura de sobra", function ()
  {
    const andares = emAndaresPelaLargura(obras(["a:1", "a:2", "a:3", "a:4", "a:5", "a:6", "a:7"]), 10_000, 3);

    expect(andares.map(function (andar) { return andar.length; })).toEqual([3, 3, 1]);
  });

  it("sem largura medida ainda, um andar só (até o teto)", function ()
  {
    expect(emAndaresPelaLargura(obras(["a:1", "a:2", "a:3"]), 0)).toEqual([obras(["a:1", "a:2", "a:3"])]);
    expect(emAndaresPelaLargura(obras(["a:1", "a:2", "a:3"]), 0, 2).map(function (andar) { return andar.length; })).toEqual([2, 1]);
  });

  it("um livro sempre cabe, mesmo num trilho estreito demais", function ()
  {
    expect(emAndaresPelaLargura(obras(["a:1", "a:2"]), 50).map(function (andar) { return andar.length; })).toEqual([1, 1]);
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
    const ids = Array.from({ length: 20 }, function (_, indice) { return "a:" + (indice + 1); });

    const andares = emAndaresPelaLargura(obras(ids), 637, 9);

    expect(andares.map(function (andar) { return andar.length; })).toEqual([9, 9, 2]);
  });

  it("a largura do livro aberto cede o que falta para o teto caber", function ()
  {
    // Nove com as lombadas mais largas possíveis: 8 × (56 + 4) = 480.
    const ids = ["a:0", "a:0", "a:0", "a:0", "a:0", "a:0", "a:0", "a:0", "a:0"];
    const largura = 2 * RECUO_DO_TRILHO + 480 + 130;

    const [andar] = emAndaresPelaLargura(obras(ids), largura, 9);

    expect(andar).toHaveLength(9);
    expect(larguraDaVitrine(andar, largura)).toBe(130);
  });

  it("nunca aperta o livro aberto além do mínimo", function ()
  {
    const ids = Array.from({ length: 9 }, function () { return "a:0"; });

    expect(larguraDaVitrine(obras(ids), 300)).toBe(VITRINE_MINIMA);
  });

  it("sem teto, a vitrine fica na largura cheia", function ()
  {
    const ids = ["a:1", "a:2", "a:3"];

    expect(larguraDaVitrine(obras(ids), 900)).toBe(LARGURA_ABERTA);
  });

  it("teto que não cabe nem com a vitrine no mínimo: volta a encher pela largura", function ()
  {
    const ids = Array.from({ length: 12 }, function (_, indice) { return "a:" + indice; });

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

// #234: as telas com grupo de nome próprio (estante por status, laboratório)
// também viram estante — cada grupo rende vários andares, e o nome fica em
// cima do primeiro.
describe("emAndaresDosGrupos", function ()
{
  const LARGURA = 2 * RECUO_DO_TRILHO + LARGURA_ABERTA + 4 * (larguraDaLombada("a:1") + VAO);

  it("cada grupo vira quantos andares couberem, na ordem", function ()
  {
    const grupos = [
      { id: "lendo", titulo: "Lendo", itens: obras(["a:1", "a:1", "a:1", "a:1", "a:1", "a:1", "a:1"]) },
      { id: "terminado", titulo: "Terminado", itens: obras(["a:1", "a:1"]) },
    ];

    const andares = emAndaresDosGrupos(grupos, LARGURA);

    expect(andares.map(function (a) { return [a.grupo, a.itens.length, a.abreOGrupo]; })).toEqual([
      ["lendo", 5, true],
      ["lendo", 2, false],
      ["terminado", 2, true],
    ]);
  });

  it("só o primeiro andar do grupo carrega o nome na tela", function ()
  {
    const grupos = [{ id: "lendo", titulo: "Lendo", itens: obras(["a:1", "a:1", "a:1", "a:1", "a:1", "a:1"]) }];

    const [primeiro, segundo] = emAndaresDosGrupos(grupos, LARGURA);

    expect(primeiro.titulo).toBe("Lendo");
    expect(primeiro.abreOGrupo).toBe(true);
    expect(segundo.abreOGrupo).toBe(false);
  });

  it("grupo vazio não vira andar nenhum", function ()
  {
    const grupos = [
      { id: "lendo", titulo: "Lendo", itens: [] },
      { id: "terminado", titulo: "Terminado", itens: obras(["a:1"]) },
    ];

    expect(emAndaresDosGrupos(grupos, LARGURA).map(function (a) { return a.grupo; })).toEqual(["terminado"]);
  });

  it("id de andar não se repete entre grupos", function ()
  {
    const grupos = [
      { id: "lendo", titulo: "Lendo", itens: obras(["a:1", "a:1", "a:1", "a:1", "a:1", "a:1"]) },
      { id: "terminado", titulo: "Terminado", itens: obras(["a:1", "a:1", "a:1", "a:1", "a:1", "a:1"]) },
    ];

    const ids = emAndaresDosGrupos(grupos, LARGURA).map(function (a) { return a.id; });

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("respeita o teto por andar", function ()
  {
    const grupos = [{ id: "g", titulo: "G", itens: obras(["a:1", "a:1", "a:1", "a:1", "a:1", "a:1", "a:1"]) }];

    const andares = emAndaresDosGrupos(grupos, 10_000, 3);

    expect(andares.map(function (a) { return a.itens.length; })).toEqual([3, 3, 1]);
  });
});
