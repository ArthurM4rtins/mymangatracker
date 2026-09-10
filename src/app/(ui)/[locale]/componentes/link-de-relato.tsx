"use client";

/**
 * O botão do rodapé para relatar erro de tradução (issue #158).
 *
 * Cliente por um motivo só: precisa saber em que tela a pessoa estava, e o
 * layout do servidor não sabe a rota. O caminho vai no `?de=`, e o domínio
 * recusa o que não for caminho do próprio site — então isto é conveniência para
 * quem lê o relato, nunca dado em que se confia.
 *
 * Era um link sublinhado solto na barra (#248). Virou botão contornado com o
 * balão de fala: numa barra de rodapé, texto sublinhado some no meio dos outros
 * textos, e este é o único ali que faz alguma coisa.
 */
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { Link } from "@/i18n/navigation";

export function LinkDeRelato()
{
  const t = useTranslations("relatar");
  const rota = usePathname();

  return (
    <Link
      href={{ pathname: "/relatar", query: { de: rota } }}
      className="group inline-flex items-center gap-2 rounded-md border border-borda px-3 py-1.5 text-xs text-texto-suave transition-colors hover:border-acento hover:text-acento"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="shrink-0"
      >
        <path d="M20 4H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3v4l4-4h9a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1Z" />
        <path d="M12 8v3" />
        <path d="M12 13.5h.01" />
      </svg>
      {t("linkDoRodape")}
    </Link>
  );
}
