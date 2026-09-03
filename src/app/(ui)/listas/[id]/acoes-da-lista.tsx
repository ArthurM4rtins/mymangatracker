"use client";

/**
 * Ações do dono na página da lista: remover uma obra e apagar a lista.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoverDaLista({
  listaId,
  anilistId,
}: {
  listaId: string;
  anilistId: number;
})
{
  const roteador = useRouter();
  const [ocupado, setOcupado] = useState(false);

  async function remover()
  {
    setOcupado(true);

    try
    {
      await fetch(`/api/v1/listas/${listaId}/itens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anilistId }),
      });
      roteador.refresh();
    }
    finally
    {
      setOcupado(false);
    }
  }

  return (
    <button
      type="button"
      onClick={function () { void remover(); }}
      disabled={ocupado}
      className="text-xs text-texto-suave underline underline-offset-4 hover:text-texto disabled:opacity-60"
    >
      remover
    </button>
  );
}

export function ApagarLista({ listaId }: { listaId: string })
{
  const roteador = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function apagar()
  {
    setOcupado(true);

    try
    {
      const resposta = await fetch(`/api/v1/listas/${listaId}`, { method: "DELETE" });

      if (resposta.ok)
      {
        roteador.push("/listas");
        roteador.refresh();
      }
    }
    finally
    {
      setOcupado(false);
    }
  }

  if (!confirmando)
  {
    return (
      <button
        type="button"
        onClick={function () { setConfirmando(true); }}
        className="text-sm text-texto-suave underline underline-offset-4 hover:text-texto"
      >
        Apagar lista
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-texto-suave">apagar de vez?</span>
      <button
        type="button"
        onClick={function () { void apagar(); }}
        disabled={ocupado}
        className="text-acento underline underline-offset-4 disabled:opacity-60"
      >
        sim
      </button>
      <button
        type="button"
        onClick={function () { setConfirmando(false); }}
        className="text-texto-suave hover:text-texto"
      >
        não
      </button>
    </span>
  );
}
