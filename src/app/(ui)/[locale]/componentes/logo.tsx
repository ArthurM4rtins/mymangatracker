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
// A palavra tem dois o, e eles caem nas duas pontas: o primeiro é uma FOLHA, o
// último é um PLANETA. A leitura sai na ordem do nome — folha abre, universo
// fecha.
//
// Nenhum dos dois cruza o miolo da letra, porque traço atravessando a
// contraforma de um o vira ø:
//   - a folha mantém o anel redondo e ganha um bico só, no alto à direita;
//   - o anel do planeta é desenhado duas vezes. Inteiro primeiro, e essa é a
//     volta de trás; o disco entra por cima preenchido com a cor do fundo e
//     engole o que cruzaria o miolo; então o anel volta, recortado na metade de
//     baixo pelo eixo maior da própria elipse, e essa é a volta que passa na
//     frente. O recorte no eixo da elipse, e não numa horizontal, é o que faz a
//     frente entrar por baixo à esquerda e sair por cima à direita, no ângulo
//     certo.
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
        viewBox="-6 0 440 100"
        aria-hidden="true"
        className="h-5 w-auto shrink-0 overflow-visible"
      >
        <defs>
          {/* Metade de baixo do anel, no eixo maior da elipse. */}
          <clipPath id="folunio-anel-frente">
            <rect
              x="338"
              y="60"
              width="100"
              height="46"
              transform="rotate(-20 388 60)"
            />
          </clipPath>
        </defs>

        {/* Anel do planeta, volta de trás. */}
        <ellipse
          cx="388"
          cy="60"
          rx="36"
          ry="13.5"
          fill="none"
          stroke="var(--acento)"
          strokeWidth="9"
          transform="rotate(-20 388 60)"
        />

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
          {/* o de folha: anel redondo, bico no alto à direita */}
          <path d="M134,32 C104,30 84,48 84,63 C84,79 97,88 112,84 C126,80 136,58 134,32 Z" />
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
        </g>

        {/* o de planeta: o disco é cheio da cor do fundo e engole a volta de trás */}
        <circle
          cx="388"
          cy="60"
          r="22"
          fill="var(--fundo)"
          stroke="currentColor"
          strokeWidth="16"
        />
        {/* e o anel volta por cima, só na metade de baixo */}
        <g clipPath="url(#folunio-anel-frente)">
          <ellipse
            cx="388"
            cy="60"
            rx="36"
            ry="13.5"
            fill="none"
            stroke="var(--acento)"
            strokeWidth="9"
            transform="rotate(-20 388 60)"
          />
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
