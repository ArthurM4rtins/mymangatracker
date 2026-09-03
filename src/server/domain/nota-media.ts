/**
 * A nota do Kidoku (issue #48): a média das notas dos NOSSOS usuários sobre
 * uma obra. O banco entrega a contagem por valor; aqui vira média com uma
 * casa e histograma com as dez posições de 0,5 a 5,0 sempre presentes.
 * Sem nota nenhuma é `null` — obra sem avaliação não tem "média zero".
 */

export const NOTAS_POSSIVEIS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

export type ContagemDeNota = { rating: number; total: number };

export type ResumoDeNotas = {
  media: number;
  total: number;
  histograma: ContagemDeNota[];
};

export function resumirNotas(
  contagens: ReadonlyArray<ContagemDeNota>,
): ResumoDeNotas | null
{
  const porValor = new Map<number, number>();

  for (const contagem of contagens)
  {
    porValor.set(contagem.rating, (porValor.get(contagem.rating) ?? 0) + contagem.total);
  }

  const histograma = NOTAS_POSSIVEIS.map(function (rating)
  {
    return { rating, total: porValor.get(rating) ?? 0 };
  });

  const total = histograma.reduce(function (soma, faixa) { return soma + faixa.total; }, 0);

  if (total === 0)
  {
    return null;
  }

  const soma = histograma.reduce(function (acumulado, faixa)
  {
    return acumulado + faixa.rating * faixa.total;
  }, 0);

  // Math.round em (x * 10) evita o lixo de ponto flutuante de toFixed.
  const media = Math.round((soma / total) * 10) / 10;

  return { media, total, histograma };
}
