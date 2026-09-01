"use client";

/** Sair apaga o cookie de fato (DELETE /api/v1/sessao), não só redireciona. */
import { useRouter } from "next/navigation";
import { useState } from "react";

export function BotaoSair()
{
  const roteador = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair()
  {
    setSaindo(true);
    try
    {
      await fetch("/api/v1/sessao", { method: "DELETE" });
      roteador.push("/");
      roteador.refresh();
    }
    finally
    {
      setSaindo(false);
    }
  }

  return (
    <button
      type="button"
      onClick={sair}
      disabled={saindo}
      aria-label="Sair"
      title="Sair"
      className="flex h-8 w-8 items-center justify-center rounded-md text-texto-suave transition-colors hover:text-texto disabled:opacity-60"
    >
      <IconeLogout />
    </button>
  );
}

function IconeLogout()
{
  return (
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
