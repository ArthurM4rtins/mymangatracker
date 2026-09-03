"use client";

/**
 * Seta de voltar no header (issue #72): volta para a tela anterior pelo
 * histórico do navegador. Na home não aparece, e sem histórico (página aberta
 * direto) leva para a home em vez de sair do site.
 */
import { usePathname, useRouter } from "next/navigation";

export function BotaoVoltar()
{
  const roteador = useRouter();
  const caminho = usePathname();

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
      aria-label="Voltar"
      title="Voltar"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-texto-suave transition-colors hover:text-texto"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
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
