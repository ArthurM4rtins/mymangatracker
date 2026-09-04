import { describe, expect, it } from "vitest";
import { normalizarCapitulo } from "@/server/domain/capitulo";

// O contrato da coluna: `ReadingProgress.chapter` é `Decimal(8, 2)` positivo.
// A regra vale para qualquer origem do número — o título lido pela extensão ou
// o campo que o usuário digitou no popup — então mora aqui, num lugar só.

describe("normalizarCapitulo", function ()
{
  it("aceita capítulo inteiro", function ()
  {
    expect(normalizarCapitulo(57)).toBe(57);
  });

  it("aceita meio capítulo: 57.5 existe", function ()
  {
    expect(normalizarCapitulo(57.5)).toBe(57.5);
  });

  it("arredonda para as duas casas que a coluna guarda", function ()
  {
    expect(normalizarCapitulo(57.567)).toBe(57.57);
  });

  it("aceita o teto da coluna", function ()
  {
    expect(normalizarCapitulo(999999.99)).toBe(999999.99);
  });

  it("recusa o que arredondaria para fora do teto", function ()
  {
    expect(normalizarCapitulo(999999.995)).toBeNull();
  });

  it("recusa acima do teto", function ()
  {
    expect(normalizarCapitulo(1000000)).toBeNull();
  });

  it("capítulo zero não existe no contrato", function ()
  {
    expect(normalizarCapitulo(0)).toBeNull();
  });

  it("recusa negativo", function ()
  {
    expect(normalizarCapitulo(-3)).toBeNull();
  });

  it("recusa o que não é número finito", function ()
  {
    expect(normalizarCapitulo(Number.NaN)).toBeNull();
    expect(normalizarCapitulo(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
