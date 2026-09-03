"use client";

/**
 * Adiciona a obra à estante (`POST /api/v1/estante`, status PLANNED).
 * Sem sessão a API responde 401 e o botão leva para /entrar.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

type Estado = "parado" | "salvando" | "salvo" | "erro";

export function BotaoEstante({
  anilistId,
  jaNaEstante = false,
  atualizarAoSalvar = false,
}: {
  anilistId: number;
  /** Vem do servidor: obra que já está na estante nasce marcada. */
  jaNaEstante?: boolean;
  /** Na página da obra, salvar recarrega os dados para os controles aparecerem. */
  atualizarAoSalvar?: boolean;
})
{
  const roteador = useRouter();
  const [estado, setEstado] = useState<Estado>(jaNaEstante ? "salvo" : "parado");

  async function adicionar()
  {
    setEstado("salvando");

    try
    {
      const resposta = await fetch("/api/v1/estante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anilistId }),
      });

      if (resposta.status === 401)
      {
        roteador.push("/entrar");
        return;
      }

      setEstado(resposta.ok ? "salvo" : "erro");

      if (resposta.ok && atualizarAoSalvar)
      {
        roteador.refresh();
      }
    }
    catch
    {
      setEstado("erro");
    }
  }

  if (estado === "salvo")
  {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-acento">
        <MarcaDeVisto /> Na estante
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={adicionar}
        disabled={estado === "salvando"}
        className="rounded-md border border-acento px-3 py-1.5 text-sm font-medium text-acento transition-colors hover:bg-acento hover:text-acento-contraste disabled:opacity-60"
      >
        {estado === "salvando" ? "Salvando…" : "+ Estante"}
      </button>
      {estado === "erro" && (
        <span role="alert" className="text-xs text-texto-suave">
          não deu — tente de novo
        </span>
      )}
    </div>
  );
}

function MarcaDeVisto()
{
  return (
    <svg width="14" height="10" viewBox="0 0 76 36" aria-hidden="true">
      <polyline
        points="4,18 18,32 46,4"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="30,18 44,32 72,4"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
