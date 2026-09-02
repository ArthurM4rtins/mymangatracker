import { describe, expect, it } from "vitest";
import { montarFeed } from "@/server/domain/atividade";

// O feed da comunidade (issue #50): resenhas e listas mescladas numa linha do
// tempo só, da mais recente à mais antiga, cortada no limite. Regra pura: as
// entradas já vêm ordenadas de cada consulta, aqui só se intercala.

const d = function (dia: number) { return new Date(`2026-09-${String(dia).padStart(2, "0")}T12:00:00Z`); };

describe("montarFeed", function ()
{
  it("intercala pela data, mais recente primeiro, marcando o tipo", function ()
  {
    const feed = montarFeed(
      [{ id: "r1", quando: d(3) }, { id: "r2", quando: d(1) }],
      [{ id: "l1", quando: d(2) }],
      10,
    );

    expect(feed.map(function (item) { return [item.tipo, item.id]; })).toEqual([
      ["resenha", "r1"],
      ["lista", "l1"],
      ["resenha", "r2"],
    ]);
  });

  it("corta no limite depois de mesclar", function ()
  {
    const feed = montarFeed(
      [{ id: "r1", quando: d(5) }, { id: "r2", quando: d(3) }],
      [{ id: "l1", quando: d(4) }, { id: "l2", quando: d(2) }],
      3,
    );

    expect(feed.map(function (item) { return item.id; })).toEqual(["r1", "l1", "r2"]);
  });

  it("empate de data: resenha antes da lista; listas vazias não quebram", function ()
  {
    const feed = montarFeed([{ id: "r1", quando: d(1) }], [{ id: "l1", quando: d(1) }], 10);

    expect(feed.map(function (item) { return item.id; })).toEqual(["r1", "l1"]);
    expect(montarFeed([], [], 10)).toEqual([]);
  });
});
