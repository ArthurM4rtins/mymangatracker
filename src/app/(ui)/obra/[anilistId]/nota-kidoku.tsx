"use client";

/**
 * A nota do Kidoku (issue #48): a média dos nossos usuários, a contagem e um
 * histograma de dez barras (0,5 a 5,0) ao estilo Letterboxd. Vive na coluna
 * da direita, embaixo de onde a pessoa avalia (issue #81): card no mesmo
 * desenho do "Sua avaliação", histograma em largura cheia embaixo.
 * Client só por causa do glyph da estrela, que vive num módulo client.
 */
import { SIMBOLO } from "../../componentes/estrelas";

export type NotaParaTela = {
  media: number;
  total: number;
  histograma: Array<{ rating: number; total: number }>;
};

export function NotaKidoku({ nota }: { nota: NotaParaTela })
{
  const maior = Math.max(...nota.histograma.map(function (faixa) { return faixa.total; }));

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-borda bg-superficie p-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
        Nota do Kidoku
      </h2>

      <p className="flex items-baseline gap-1.5">
        <span aria-hidden className="text-nota">{SIMBOLO}</span>
        <span className="font-marca text-3xl font-bold tabular-nums leading-none">
          {nota.media.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
        </span>
        <span className="text-sm text-texto-suave">
          · {nota.total} {nota.total === 1 ? "avaliação" : "avaliações"}
        </span>
      </p>

      <ul
        aria-label="Distribuição das notas"
        className="flex h-10 items-end gap-1"
      >
        {nota.histograma.map(function (faixa)
        {
          const altura = maior === 0 ? 0 : Math.max(faixa.total === 0 ? 0 : 8, (faixa.total / maior) * 100);

          return (
            <li
              key={faixa.rating}
              title={`${faixa.rating.toLocaleString("pt-BR")} ${SIMBOLO}: ${faixa.total}`}
              className="flex h-full flex-1 items-end"
            >
              <span
                className="block w-full rounded-t-sm bg-nota/70"
                style={{ height: `${altura}%`, minHeight: faixa.total === 0 ? "2px" : undefined }}
              />
            </li>
          );
        })}
      </ul>
      <p aria-hidden className="flex justify-between text-[10px] text-texto-suave">
        <span>0,5</span>
        <span>5,0</span>
      </p>
    </section>
  );
}
