"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

// Cada tema vira uma bolinha de duas metades: fundo à esquerda, acento à
// direita — as cores são as NOSSAS variáveis de tema (swatch funcional, não o
// trio do Letterboxd; ver lessons.md).
// O nome de cada tema vem do catálogo, pela chave `tema.nomes.<id>`.
const TEMAS = [
  { id: "sumi", fundo: "#faf7f2", acento: "#d6402b" },
  { id: "noturno", fundo: "#12141f", acento: "#f0a842" },
  { id: "matcha", fundo: "#343a2f", acento: "#a3c585" },
] as const;

type Tema = (typeof TEMAS)[number]["id"];

// A chave antiga (`kidoku-tema`) é migrada uma vez pelo script anti-flash do
// layout, antes do primeiro paint — quando este componente monta, só existe esta.
const CHAVE = "folunio-tema";

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
  const t = useTranslations("componentes");

  return (
    <div role="group" aria-label={t("tema.grupo")} className="flex items-center gap-1.5">
      {TEMAS.map(function (tema) {
        const selecionado = ativo === tema.id;
        const rotulo = t(`tema.nomes.${tema.id}`);
        return (
          <button
            key={tema.id}
            type="button"
            onClick={function () {
              escolher(tema.id);
            }}
            aria-pressed={selecionado}
            aria-label={t("tema.escolher", { nome: rotulo })}
            title={rotulo}
            className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${
              selecionado ? "border-acento ring-2 ring-acento/50" : "border-borda"
            }`}
            style={{
              background: `linear-gradient(90deg, ${tema.fundo} 50%, ${tema.acento} 50%)`,
            }}
          />
        );
      })}
    </div>
  );
}
