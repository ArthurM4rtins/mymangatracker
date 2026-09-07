"use client";

/**
 * Troca o status de uma entrada (`PATCH /api/v1/estante/:id`) e recarrega os
 * dados do servidor — a lista e as contagens das abas vêm de lá, não daqui.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StatusDaEstante } from "@/server/services/estante.service";

const ROTULOS: Record<StatusDaEstante, string> = {
  READING: "Lendo",
  COMPLETED: "Concluído",
  PLANNED: "Planejado",
  PAUSED: "Pausado",
  DROPPED: "Largado",
};

export function SeletorStatus({
  entradaId,
  status,
}: {
  entradaId: string;
  status: StatusDaEstante;
})
{
  const roteador = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(false);

  async function mudar(novo: string)
  {
    setSalvando(true);
    setErro(false);

    try
    {
      const resposta = await fetch(`/api/v1/estante/${entradaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novo }),
      });

      if (resposta.status === 401)
      {
        roteador.push("/entrar");
        return;
      }

      if (!resposta.ok)
      {
        setErro(true);
        return;
      }

      roteador.refresh();
    }
    catch
    {
      setErro(true);
    }
    finally
    {
      setSalvando(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={function (evento) { void mudar(evento.target.value); }}
        disabled={salvando}
        aria-label="Status da obra"
        className="rounded-md border border-borda bg-superficie px-2 py-1.5 text-sm outline-none focus:border-acento disabled:opacity-60"
      >
        {Object.entries(ROTULOS).map(function ([valor, rotulo])
        {
          return (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          );
        })}
      </select>
      {erro && (
        <span role="alert" className="text-xs text-texto-suave">
          não deu — tente de novo
        </span>
      )}
    </div>
  );
}
