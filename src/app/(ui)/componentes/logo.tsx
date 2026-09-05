// PROVA DO PORTAO (#64): import proibido de proposito, PR sera fechado sem merge.
import "@/server/repositories/shelf.repository";
import Link from "next/link";

// Marca do Kidoku: o double-check do "visualizado" (primeiro visto no acento do
// tema, segundo na cor do texto), o nome desenhado no mesmo traço monolinha do
// check, e 既読 — "já lido" — no acento.
//
// Variante D com peso 16, escolhida no estudo de 02/09/2026:
// Obsidian/02. Implementacoes/identidade-visual/estudo-fonte-nome-logo.html
//
// Métrica do desenho, numa caixa de 100 de altura: ascendente em y=8, altura-x
// em y=36, base em y=84. As barrigas do d, do o e do u são traço, não
// preenchimento — o anel passa da base de propósito, como no estudo.
export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-[7px]"
      aria-label="Kidoku — início"
    >
      <svg
        viewBox="0 0 76 36"
        aria-hidden="true"
        className="h-auto w-6 shrink-0 overflow-visible"
      >
        <polyline
          points="4,18 18,32 46,4"
          fill="none"
          stroke="var(--acento)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="30,18 44,32 72,4"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <svg
        viewBox="-6 0 374 100"
        aria-hidden="true"
        className="h-5 w-auto shrink-0 overflow-visible"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* k */}
          <line x1="8" y1="8" x2="8" y2="84" />
          <line x1="12" y1="58" x2="46" y2="36" />
          <line x1="22" y1="54" x2="50" y2="84" />
          {/* i */}
          <line x1="74" y1="36" x2="74" y2="84" />
          {/* d */}
          <circle cx="122" cy="60" r="22" />
          <line x1="144" y1="8" x2="144" y2="84" />
          {/* o */}
          <circle cx="192" cy="60" r="22" />
          {/* k */}
          <line x1="240" y1="8" x2="240" y2="84" />
          <line x1="244" y1="58" x2="278" y2="36" />
          <line x1="254" y1="54" x2="282" y2="84" />
          {/* u */}
          <path d="M306,36 V64 A20,20 0 0 0 346,64 V36" />
          <line x1="346" y1="36" x2="346" y2="84" />
        </g>
        {/* pingo do i, único traço cheio */}
        <circle cx="74" cy="20" r="7" fill="currentColor" />
      </svg>

      <span
        aria-hidden="true"
        className="font-marca text-acento mb-[0.08em] self-end text-[0.55rem] font-bold tracking-[0.05em]"
      >
        既読
      </span>
    </Link>
  );
}
