import { describe, expect, it } from "vitest";
import {
  contarPorStatus,
  interpretarFiltroDasAvaliadas,
  ordenarAvaliadas,
} from "@/server/domain/perfil";

// As regras do perfil (issue #49): a estante do DONO aparece em contagens com
// os cinco status sempre presentes; a grade pública de avaliadas é filtrável
// por nota e ordenável por data ou nota — parâmetros vêm da URL, então tudo
// passa por whitelist.

describe("contarPorStatus", function ()
{
  it("preenche os cinco status com zero quando não há entradas", function ()
  {
    expect(contarPorStatus([])).toEqual({
      READING: 0,
      COMPLETED: 0,
      PLANNED: 0,
      PAUSED: 0,
      DROPPED: 0,
    });
  });

  it("conta cada status presente", function ()
  {
    expect(
      contarPorStatus([
        { status: "READING" },
        { status: "READING" },
        { status: "DROPPED" },
      ]),
    ).toEqual({ READING: 2, COMPLETED: 0, PLANNED: 0, PAUSED: 0, DROPPED: 1 });
  });
});

describe("interpretarFiltroDasAvaliadas", function ()
{
  it("sem parâmetros: mais recentes, sem filtro de nota", function ()
  {
    expect(interpretarFiltroDasAvaliadas({})).toEqual({ ordem: "recentes" });
  });

  it("aceita ordem e nota válidas", function ()
  {
    expect(interpretarFiltroDasAvaliadas({ ordem: "maior_nota", nota: "4.5" })).toEqual({
      ordem: "maior_nota",
      nota: 4.5,
    });
  });

  it("descarta ordem desconhecida e nota fora da escala em silêncio", function ()
  {
    expect(interpretarFiltroDasAvaliadas({ ordem: "aleatoria", nota: "4.3" })).toEqual({
      ordem: "recentes",
    });
    expect(interpretarFiltroDasAvaliadas({ nota: "6" })).toEqual({ ordem: "recentes" });
    expect(interpretarFiltroDasAvaliadas({ nota: "0" })).toEqual({ ordem: "recentes" });
  });
});

describe("ordenarAvaliadas", function ()
{
  const AVALIADAS = [
    { anilistId: 1, rating: 3, avaliadaEm: new Date("2026-08-01") },
    { anilistId: 2, rating: 5, avaliadaEm: new Date("2026-08-03") },
    { anilistId: 3, rating: 4.5, avaliadaEm: new Date("2026-08-02") },
    { anilistId: 4, rating: 5, avaliadaEm: new Date("2026-08-04") },
  ];

  function ids(itens: Array<{ anilistId: number }>)
  {
    return itens.map(function (item) { return item.anilistId; });
  }

  it("recentes e antigas ordenam pela data da avaliação", function ()
  {
    expect(ids(ordenarAvaliadas(AVALIADAS, { ordem: "recentes" }))).toEqual([4, 2, 3, 1]);
    expect(ids(ordenarAvaliadas(AVALIADAS, { ordem: "antigas" }))).toEqual([1, 3, 2, 4]);
  });

  it("por nota: empate cai para a mais recente", function ()
  {
    expect(ids(ordenarAvaliadas(AVALIADAS, { ordem: "maior_nota" }))).toEqual([4, 2, 3, 1]);
    expect(ids(ordenarAvaliadas(AVALIADAS, { ordem: "menor_nota" }))).toEqual([1, 3, 4, 2]);
  });

  it("nota filtra pela nota exata e não muda a entrada", function ()
  {
    expect(ids(ordenarAvaliadas(AVALIADAS, { ordem: "recentes", nota: 5 }))).toEqual([4, 2]);
    expect(ids(AVALIADAS)).toEqual([1, 2, 3, 4]);
  });
});
