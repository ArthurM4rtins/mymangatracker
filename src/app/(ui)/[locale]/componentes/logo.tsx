import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

// Marca do Folunio: o double-check do "visualizado" (primeiro visto no acento do
// tema, segundo na cor do texto), o nome desenhado no mesmo traço monolinha do
// check, e 葉宙 no acento — 葉 folha, 宙 o espaço aberto, os dois sentidos que
// formam o nome.
//
// O símbolo é o mesmo de 02/09/2026; a palavra foi redesenhada no rebranding de
// 11/09 mantendo a métrica do estudo:
// Obsidian/02. Implementacoes/identidade-visual/identidade-folunio.html
//
// Métrica do desenho, numa caixa de 100 de altura: ascendente em y=8, altura-x
// em y=36, base em y=84, entreletra de 12 entre bordas de traço. As barrigas do
// o e do u são traço, não preenchimento.
//
// O wordmark de assinatura — com folha no primeiro o e planeta no último — vive
// só nas peças grandes (OG, loja, abertura). Aqui, em 20px de altura, o anel do
// planeta teria 1,8px e viraria sujeira dentro da letra.
export async function Logo() {
  const t = await getTranslations("componentes");

  return (
    <Link
      href="/"
      className="inline-flex items-center gap-[7px]"
      aria-label={t("logo.rotulo")}
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
        viewBox="-6 0 420 100"
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
          {/* f */}
          <path d="M34,84 V26 A18,18 0 0 1 52,8" />
          <line x1="12" y1="36" x2="58" y2="36" />
          {/* o */}
          <circle cx="108" cy="60" r="22" />
          {/* l */}
          <line x1="158" y1="8" x2="158" y2="84" />
          {/* u */}
          <path d="M186,36 V64 A20,20 0 0 0 226,64 V36" />
          <line x1="226" y1="36" x2="226" y2="84" />
          {/* n */}
          <line x1="254" y1="84" x2="254" y2="36" />
          <path d="M254,58 A22,22 0 0 1 298,58 V84" />
          {/* i */}
          <line x1="326" y1="36" x2="326" y2="84" />
          {/* o */}
          <circle cx="376" cy="60" r="22" />
        </g>
        {/* pingo do i, único traço cheio — leva o acento que era do kanji */}
        <circle cx="326" cy="19" r="7.5" fill="var(--acento)" />
      </svg>

      <span
        aria-hidden="true"
        className="font-marca text-acento mb-[0.08em] self-end text-[0.55rem] font-bold tracking-[0.05em]"
      >
        葉宙
      </span>
    </Link>
  );
}
