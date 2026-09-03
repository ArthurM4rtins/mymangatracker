"use client";

/**
 * Vitrine em carrossel (issue #76), versão "palco": cinco cards visíveis, o
 * do centro em destaque e os dois de cada lado esmaecendo e encolhendo
 * conforme se afastam. Avança um card a cada poucos segundos, pausa no hover
 * e no foco, setas nas laterais, loop cíclico. `prefers-reduced-motion`
 * desliga o avanço automático. Os cards já vêm renderizados do servidor.
 */
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";

const INTERVALO_MS = 4000;
const VISIVEIS_DE_CADA_LADO = 2;
/** Distância entre centros de cards vizinhos, em % da largura do card. */
const PASSO = 78;

const CONSULTA_REDUZ_MOVIMENTO = "(prefers-reduced-motion: reduce)";

function assinarReduzMovimento(aoMudar: () => void)
{
  const consulta = window.matchMedia(CONSULTA_REDUZ_MOVIMENTO);
  consulta.addEventListener("change", aoMudar);

  return function () { consulta.removeEventListener("change", aoMudar); };
}

function lerReduzMovimento() { return window.matchMedia(CONSULTA_REDUZ_MOVIMENTO).matches; }

function reduzMovimentoNoServidor() { return false; }

/** Aparência por distância do centro: 0 é o destaque, ±2 é a borda do palco. */
function estiloPorDistancia(distancia: number): CSSProperties
{
  const longe = Math.abs(distancia);
  const escala = longe === 0 ? 1 : longe === 1 ? 0.9 : 0.8;
  const opacidade = longe === 0 ? 1 : longe === 1 ? 0.55 : 0.22;

  return {
    transform: `translateX(calc(-50% + ${distancia * PASSO}%)) scale(${escala})`,
    opacity: longe > VISIVEIS_DE_CADA_LADO ? 0 : opacidade,
    zIndex: 10 - longe,
    pointerEvents: longe > VISIVEIS_DE_CADA_LADO ? "none" : undefined,
    filter: longe === 0 ? undefined : `blur(${longe * 0.6}px)`,
  };
}

export function Carrossel({
  titulo,
  itens,
  vazio,
}: {
  titulo: string;
  itens: ReactNode[];
  vazio: string;
})
{
  const [centro, setCentro] = useState(0);
  const [pausado, setPausado] = useState(false);
  const reduzMovimento = useSyncExternalStore(
    assinarReduzMovimento,
    lerReduzMovimento,
    reduzMovimentoNoServidor,
  );
  const total = itens.length;

  const avancar = useCallback(function (passos: number)
  {
    if (total > 0)
    {
      setCentro(function (c) { return (c + passos + total) % total; });
    }
  }, [total]);

  useEffect(function ()
  {
    if (pausado || reduzMovimento || total <= 1)
    {
      return;
    }

    const temporizador = window.setInterval(function () { avancar(1); }, INTERVALO_MS);

    return function () { window.clearInterval(temporizador); };
  }, [pausado, reduzMovimento, total, avancar]);

  // Distância cíclica: com 12 cards, o item 11 fica a -1 do item 0.
  function distanciaDe(indice: number): number
  {
    let d = indice - centro;

    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;

    return d;
  }

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">{titulo}</h2>

      {total === 0 ? (
        <p className="text-sm text-texto-suave">{vazio}</p>
      ) : (
        <div
          className="relative"
          onMouseEnter={function () { setPausado(true); }}
          onMouseLeave={function () { setPausado(false); }}
          onFocus={function () { setPausado(true); }}
          onBlur={function () { setPausado(false); }}
        >
          {/* O palco: os cards ficam absolutos sobre o centro; a altura vem de
              um card invisível no fluxo, para o bloco não colapsar. */}
          {/* mx-14 reserva a faixa das setas: elas ficam fora do palco,
              nunca em cima do card da borda. */}
          <div className="relative mx-14 overflow-hidden">
            <div aria-hidden className="invisible mx-auto w-max">{itens[0]}</div>
            {itens.map(function (item, indice)
            {
              const distancia = distanciaDe(indice);
              const visivel = Math.abs(distancia) <= VISIVEIS_DE_CADA_LADO;

              return (
                <div
                  key={indice}
                  aria-hidden={distancia !== 0 || undefined}
                  className="absolute left-1/2 top-0 transition-[transform,opacity,filter] duration-500 ease-out"
                  style={estiloPorDistancia(distancia)}
                  onClick={visivel && distancia !== 0 ? function () { avancar(distancia); } : undefined}
                >
                  <div className={distancia === 0 ? "" : "cursor-pointer"} inert={distancia !== 0 || undefined}>
                    {item}
                  </div>
                </div>
              );
            })}
          </div>

          {total > 1 && (
            <>
              <Seta lado="esquerda" aoClicar={function () { avancar(-1); }} />
              <Seta lado="direita" aoClicar={function () { avancar(1); }} />
              <p className="mt-2 text-center text-xs tabular-nums text-texto-suave">
                {centro + 1} / {total}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Seta({ lado, aoClicar }: { lado: "esquerda" | "direita"; aoClicar: () => void })
{
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={lado === "esquerda" ? "Anterior" : "Próximo"}
      // "Liquid glass": vidro translúcido com blur do que passa atrás, borda
      // clara fina e um fio de luz na parte de cima.
      className={`absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-texto shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.15),0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md backdrop-saturate-150 transition-all hover:scale-105 hover:border-white/40 hover:bg-white/20 hover:text-acento active:scale-95 ${
        lado === "esquerda" ? "left-0" : "right-0"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {lado === "esquerda" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  );
}
