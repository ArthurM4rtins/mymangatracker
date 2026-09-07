"use client";

/**
 * Seta de voltar no header (issue #72): volta para a tela anterior pelo
 * histórico do navegador. Na home não aparece, e sem histórico (página aberta
 * direto) leva para a home em vez de sair do site.
 */
import { useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";

export function BotaoVoltar()
{
  const roteador = useRouter();
  const caminho = usePathname();
  const t = useTranslations("comum");

  if (caminho === "/")
  {
    return null;
  }

  function voltar()
  {
    if (window.history.length > 1)
    {
      roteador.back();
      return;
    }

    roteador.push("/");
  }

  return (
    <button
      type="button"
      onClick={voltar}
      aria-label={t("voltar")}
      title={t("voltar")}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-texto transition-colors hover:text-acento"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </button>
  );
}
