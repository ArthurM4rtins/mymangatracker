"use client";

import { useSyncExternalStore } from "react";

const TEMAS = [
  { id: "sumi", rotulo: "Sumi" },
  { id: "noturno", rotulo: "Noturno" },
  { id: "matcha", rotulo: "Matcha" },
] as const;

type Tema = (typeof TEMAS)[number]["id"];

const CHAVE = "kidoku-tema";

// A fonte de verdade do tema é o data-theme no <html> — aplicado antes do primeiro
// paint pelo script inline do layout. Aqui só se observa e troca; nada de estado próprio.
function assinar(aoMudar: () => void) {
  const observador = new MutationObserver(aoMudar);
  observador.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return function () {
    observador.disconnect();
  };
}

function lerTemaAtivo(): Tema | null {
  const atual = document.documentElement.getAttribute("data-theme");
  if (atual === "sumi" || atual === "noturno" || atual === "matcha") {
    return atual;
  }
  return null;
}

function lerTemaNoServidor(): Tema | null {
  return null;
}

function escolher(tema: Tema) {
  document.documentElement.setAttribute("data-theme", tema);
  try {
    localStorage.setItem(CHAVE, tema);
  } catch {
    // navegação privada sem storage: o tema vale só para a visita atual
  }
}

export function SeletorTema() {
  const ativo = useSyncExternalStore(assinar, lerTemaAtivo, lerTemaNoServidor);

  return (
    <div
      role="group"
      aria-label="Tema do site"
      className="flex items-center rounded-full border border-borda p-0.5"
    >
      {TEMAS.map(function (tema) {
        const selecionado = ativo === tema.id;
        return (
          <button
            key={tema.id}
            type="button"
            onClick={function () {
              escolher(tema.id);
            }}
            aria-pressed={selecionado}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              selecionado
                ? "bg-acento font-medium text-acento-contraste"
                : "text-texto-suave hover:text-texto"
            }`}
          >
            {tema.rotulo}
          </button>
        );
      })}
    </div>
  );
}
