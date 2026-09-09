import { describe, expect, it } from "vitest";
import { noMaximoPorAutor } from "@/server/domain/rodizio-de-autoria";

// A regra da issue #144: nenhuma conta ocupa um trilho público inteiro, nem
// dentro da própria cota de criação. A ordem que chega é a do ranking — o
// rodízio só pula o excedente de quem já apareceu demais, nunca reordena.

type Card = { id: string; autor: string };

function cards(autores: string[]): Card[]
{
  return autores.map(function (autor, indice)
  {
    return { id: `c${indice}`, autor };
  });
}

function autorDe(card: Card): string
{
  return card.autor;
}

describe("noMaximoPorAutor", function ()
{
  it("uma conta sozinha não ocupa o trilho inteiro", function ()
  {
    const entrada = cards(["ana", "ana", "ana", "ana", "bia", "caio"]);

    expect(noMaximoPorAutor(entrada, autorDe, 2, 4).map(autorDe)).toEqual([
      "ana",
      "ana",
      "bia",
      "caio",
    ]);
  });

  it("preserva a ordem do ranking entre os que passam", function ()
  {
    const entrada = cards(["ana", "bia", "ana", "caio", "ana", "bia"]);

    expect(noMaximoPorAutor(entrada, autorDe, 2, 6).map(function (card) { return card.id; })).toEqual([
      "c0",
      "c1",
      "c2",
      "c3",
      "c5",
    ]);
  });

  it("corta no limite mesmo quando sobra gente para preencher", function ()
  {
    const entrada = cards(["ana", "bia", "caio", "dani", "elis"]);

    expect(noMaximoPorAutor(entrada, autorDe, 2, 3)).toHaveLength(3);
  });

  it("devolve menos que o limite quando não há autores suficientes", function ()
  {
    const entrada = cards(["ana", "ana", "ana", "ana"]);

    expect(noMaximoPorAutor(entrada, autorDe, 2, 10).map(autorDe)).toEqual(["ana", "ana"]);
  });

  it("entrada vazia sai vazia", function ()
  {
    expect(noMaximoPorAutor([], autorDe, 2, 10)).toEqual([]);
  });
});
