"use client";

/**
 * Vitrine em carrossel (issue #76): trilho que anda sozinho devagar, para
 * quando o mouse ou o foco está em cima, setas pulam uma tela, e o seletor
 * troca de trilho sem refetch — todos já vêm renderizados do servidor.
 * `prefers-reduced-motion` desliga o movimento; trilho que cabe inteiro na
 * tela também não anda.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

export type TrilhoDoCarrossel = {
  chave: string;
  rotulo: string;
  itens: ReactNode[];
  vazio: string;
};

const PIXELS_POR_SEGUNDO = 24;

export function Carrossel({
  titulo,
  trilhos,
  verMais,
}: {
  titulo: string;
  trilhos: TrilhoDoCarrossel[];
  verMais?: { href: string; rotulo: string };
})
{
  const [ativo, setAtivo] = useState(trilhos[0]?.chave ?? "");
  const trilho = trilhos.find(function (t) { return t.chave === ativo; }) ?? trilhos[0];
  const faixa = useRef<HTMLDivElement>(null);
  const pausado = useRef(false);

  useEffect(function ()
  {
    const elemento = faixa.current;

    if (elemento === null || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    {
      return;
    }

    let quadro = 0;
    let antes = performance.now();

    function passo(agora: number)
    {
      const dt = (agora - antes) / 1000;
      antes = agora;

      if (elemento !== null && !pausado.current && !document.hidden)
      {
        const maximo = elemento.scrollWidth - elemento.clientWidth;

        if (maximo > 0)
        {
          if (elemento.scrollLeft >= maximo - 1)
          {
            elemento.scrollLeft = 0;
          }
          else
          {
            elemento.scrollLeft += PIXELS_POR_SEGUNDO * dt;
          }
        }
      }

      quadro = requestAnimationFrame(passo);
    }

    quadro = requestAnimationFrame(passo);

    return function () { cancelAnimationFrame(quadro); };
  }, [ativo]);

  function pular(direcao: -1 | 1)
  {
    const elemento = faixa.current;

    if (elemento !== null)
    {
      elemento.scrollBy({ left: direcao * elemento.clientWidth * 0.8, behavior: "smooth" });
    }
  }

  return (
    <section
      className="flex flex-col gap-3"
      onMouseEnter={function () { pausado.current = true; }}
      onMouseLeave={function () { pausado.current = false; }}
      onFocus={function () { pausado.current = true; }}
      onBlur={function () { pausado.current = false; }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">{titulo}</h2>
        <div className="flex items-center gap-3">
          {trilhos.length > 1 && (
            <div role="tablist" aria-label={titulo} className="flex rounded-md border border-borda p-0.5 text-xs">
              {trilhos.map(function (t)
              {
                const selecionado = t.chave === trilho?.chave;

                return (
                  <button
                    key={t.chave}
                    type="button"
                    role="tab"
                    aria-selected={selecionado}
                    onClick={function () { setAtivo(t.chave); }}
                    className={`rounded px-2.5 py-1 transition-colors ${
                      selecionado ? "bg-superficie text-texto" : "text-texto-suave hover:text-texto"
                    }`}
                  >
                    {t.rotulo}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-1">
            <Seta direcao={-1} aoClicar={function () { pular(-1); }} />
            <Seta direcao={1} aoClicar={function () { pular(1); }} />
          </div>
        </div>
      </div>

      {trilho === undefined || trilho.itens.length === 0 ? (
        <p className="text-sm text-texto-suave">{trilho?.vazio}</p>
      ) : (
        <div
          ref={faixa}
          className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]"
        >
          {trilho.itens.map(function (item, indice)
          {
            return (
              <div key={indice} className="snap-start shrink-0">
                {item}
              </div>
            );
          })}
          {verMais && (
            <a
              href={verMais.href}
              className="flex w-40 shrink-0 snap-start items-center justify-center rounded-lg border border-dashed border-borda text-sm text-acento hover:border-acento"
            >
              {verMais.rotulo}
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function Seta({ direcao, aoClicar }: { direcao: -1 | 1; aoClicar: () => void })
{
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={direcao === -1 ? "Anterior" : "Próximo"}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-borda text-texto-suave transition-colors hover:border-acento hover:text-acento"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {direcao === -1 ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  );
}
