import { describe, expect, it } from "vitest";
import { resumirNotas } from "@/server/domain/nota-media";

// A nota do Kidoku (issue #48): média das notas dos NOSSOS usuários sobre uma
// obra, a partir da contagem por valor (o banco agrupa; o domínio resume).
// Média com uma casa; histograma com as dez posições de 0,5 a 5,0 sempre
// presentes, na ordem crescente. Sem nota nenhuma = null, não zero.

describe("resumirNotas", function ()
{
  it("sem nota devolve null — obra sem avaliação não tem média zero", function ()
  {
    expect(resumirNotas([])).toBeNull();
  });

  it("média ponderada pela contagem, com uma casa", function ()
  {
    const resumo = resumirNotas([
      { rating: 5, total: 2 },
      { rating: 4, total: 1 },
      { rating: 2.5, total: 1 },
    ]);

    // (10 + 4 + 2.5) / 4 = 4.125 → 4.1
    expect(resumo).toMatchObject({ media: 4.1, total: 4 });
  });

  it("histograma tem as dez posições, em ordem, com zero onde não há nota", function ()
  {
    const resumo = resumirNotas([
      { rating: 5, total: 2 },
      { rating: 0.5, total: 1 },
    ]);

    expect(resumo?.histograma).toEqual([
      { rating: 0.5, total: 1 },
      { rating: 1, total: 0 },
      { rating: 1.5, total: 0 },
      { rating: 2, total: 0 },
      { rating: 2.5, total: 0 },
      { rating: 3, total: 0 },
      { rating: 3.5, total: 0 },
      { rating: 4, total: 0 },
      { rating: 4.5, total: 0 },
      { rating: 5, total: 2 },
    ]);
  });

  it("arredonda meio para cima e não deixa lixo de ponto flutuante", function ()
  {
    // (4.5 + 4.5 + 4) / 3 = 4.333… → 4.3 ; (3.5 + 4) / 2 = 3.75 → 3.8
    expect(resumirNotas([{ rating: 4.5, total: 2 }, { rating: 4, total: 1 }])?.media).toBe(4.3);
    expect(resumirNotas([{ rating: 3.5, total: 1 }, { rating: 4, total: 1 }])?.media).toBe(3.8);
  });
});
