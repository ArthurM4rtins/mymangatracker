"use client";

/**
 * Vitrine em carrossel (issue #76). Dois modos:
 *
 * - AUTO (inicial): o trilho anda sozinho por `transform` em CSS — só
 *   compositor, sem layout por frame — com uma segunda cópia dos cards
 *   emendada no fim para o loop fechar sem salto. Pausa no hover e no foco
 *   pelo `animation-play-state`. Trilho que cabe inteiro não anda, e
 *   `prefers-reduced-motion` também desliga.
 * - MANUAL: a primeira seta desliga a animação e o trilho vira um scroll
 *   normal, com snap e rolagem pelas setas ou pelo dedo.
 *
 * O seletor troca de trilho sem refetch — todos já vêm do servidor.
 */
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

const CONSULTA_REDUZ_MOVIMENTO = "(prefers-reduced-motion: reduce)";

function assinarReduzMovimento(aoMudar: () => void)
{
  const consulta = window.matchMedia(CONSULTA_REDUZ_MOVIMENTO);
  consulta.addEventListener("change", aoMudar);

  return function () { consulta.removeEventListener("change", aoMudar); };
}

function lerReduzMovimento() { return window.matchMedia(CONSULTA_REDUZ_MOVIMENTO).matches; }

function reduzMovimentoNoServidor() { return false; }

export type TrilhoDoCarrossel = {
  chave: string;
  rotulo: string;
  itens: ReactNode[];
  vazio: string;
};

/** Segundos por card: 12 cards levam ~70 s para dar a volta. */
const SEGUNDOS_POR_CARD = 6;

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
  const [modo, setModo] = useState<"auto" | "manual">("auto");
  const [transborda, setTransborda] = useState(false);
  const reduzMovimento = useSyncExternalStore(
    assinarReduzMovimento,
    lerReduzMovimento,
    reduzMovimentoNoServidor,
  );
  const janela = useRef<HTMLDivElement>(null);
  const copia = useRef<HTMLDivElement>(null);

  const trilho = trilhos.find(function (t) { return t.chave === ativo; }) ?? trilhos[0];
  const totalDeItens = (trilho?.itens.length ?? 0) + (verMais ? 1 : 0);

  // Só anda o que não cabe. O ResizeObserver mede depois do layout, fora do
  // render, e acompanha a janela mudando de largura.
  useEffect(function ()
  {
    const alvo = janela.current;

    if (alvo === null)
    {
      return;
    }

    const observador = new ResizeObserver(function ()
    {
      if (copia.current !== null)
      {
        setTransborda(copia.current.scrollWidth > alvo.clientWidth);
      }
    });

    observador.observe(alvo);

    return function () { observador.disconnect(); };
  }, [ativo]);

  const anima = modo === "auto" && transborda && !reduzMovimento;

  function pular(direcao: -1 | 1)
  {
    setModo("manual");

    requestAnimationFrame(function ()
    {
      const elemento = janela.current;

      if (elemento !== null)
      {
        elemento.scrollBy({ left: direcao * elemento.clientWidth * 0.8, behavior: "smooth" });
      }
    });
  }

  function cards(escondido: boolean)
  {
    return (
      <div
        ref={escondido ? undefined : copia}
        aria-hidden={escondido || undefined}
        className="flex shrink-0 gap-3 pr-3"
      >
        {trilho?.itens.map(function (item, indice)
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
            tabIndex={escondido ? -1 : undefined}
            className="flex w-40 shrink-0 snap-start items-center justify-center rounded-lg border border-dashed border-borda text-sm text-acento hover:border-acento"
          >
            {verMais.rotulo}
          </a>
        )}
      </div>
    );
  }

  return (
    <section className="group flex min-w-0 flex-col gap-3">
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
          ref={janela}
          // contain:layout — sem isso o Chrome soma a largura do trilho ao
          // documento e a página inteira ganha rolagem horizontal.
          className={`min-w-0 max-w-full pb-2 [contain:layout] ${
            modo === "auto"
              ? "overflow-hidden"
              : "snap-x overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          }`}
        >
          <div
            className={`flex w-max ${
              anima ? "group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]" : ""
            }`}
            style={anima ? { animation: `deslizar-vitrine ${totalDeItens * SEGUNDOS_POR_CARD}s linear infinite` } : undefined}
          >
            {cards(false)}
            {anima && cards(true)}
          </div>
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
