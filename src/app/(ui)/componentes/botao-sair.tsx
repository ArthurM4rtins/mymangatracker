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
      className="text-sm text-texto-suave transition-colors hover:text-texto disabled:opacity-60"
    >
      {saindo ? "Saindo…" : "Sair"}
    </button>
  );
}
