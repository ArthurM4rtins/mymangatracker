import { describe, expect, it } from "vitest";
import { ratingValido } from "@/server/domain/rating";

// A regra do CLAUDE.md raiz: 0,5 a 5,0, sempre múltiplo de 0,5.

describe("ratingValido", function ()
{
  it("aceita os passos de meia estrela", function ()
  {
    for (const valor of [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5])
    {
      expect(ratingValido(valor)).toBe(true);
    }
  });

  it("recusa zero e negativos", function ()
  {
    expect(ratingValido(0)).toBe(false);
    expect(ratingValido(-1)).toBe(false);
  });

  it("recusa acima de 5", function ()
  {
    expect(ratingValido(5.5)).toBe(false);
  });

  it("recusa o que não é múltiplo de 0,5", function ()
  {
    expect(ratingValido(3.7)).toBe(false);
    expect(ratingValido(4.25)).toBe(false);
  });

  it("recusa o que não é número finito", function ()
  {
    expect(ratingValido(Number.NaN)).toBe(false);
    expect(ratingValido(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
