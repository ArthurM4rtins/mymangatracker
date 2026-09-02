"use client";

/**
 * A nota do Kidoku no hero da obra (issue #48): a média dos nossos usuários,
 * a contagem e um histograma de dez barras (0,5 a 5,0) ao estilo Letterboxd.
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
    <div className="flex items-end gap-4">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-texto-suave">Nota do Kidoku</span>
        <span className="flex items-baseline gap-1.5">
          <span aria-hidden className="text-nota">{SIMBOLO}</span>
          <span className="font-marca text-3xl font-bold tabular-nums leading-none">
            {nota.media.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
          </span>
          <span className="text-sm text-texto-suave">
            · {nota.total} {nota.total === 1 ? "avaliação" : "avaliações"}
          </span>
        </span>
      </div>

      <ul
        aria-label="Distribuição das notas"
        className="flex h-10 items-end gap-0.5"
      >
        {nota.histograma.map(function (faixa)
        {
          const altura = maior === 0 ? 0 : Math.max(faixa.total === 0 ? 0 : 8, (faixa.total / maior) * 100);

          return (
            <li
              key={faixa.rating}
              title={`${faixa.rating.toLocaleString("pt-BR")} ${SIMBOLO}: ${faixa.total}`}
              className="flex h-full w-2.5 items-end"
            >
              <span
                className="block w-full rounded-t-sm bg-nota/70"
                style={{ height: `${altura}%`, minHeight: faixa.total === 0 ? "2px" : undefined }}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
