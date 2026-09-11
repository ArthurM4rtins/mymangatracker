"use client";

/**
 * Troca o status de uma entrada (`PATCH /api/v1/estante/:id`) e recarrega os
 * dados do servidor — a lista e as contagens das abas vêm de lá, não daqui.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { StatusDaEstante } from "@/server/services/estante.service";

/** A ordem do seletor; o rótulo de cada um vem do catálogo comum. */
const STATUS: StatusDaEstante[] = [
  "READING",
  "COMPLETED",
  "PLANNED",
  "PAUSED",
  "DROPPED",
];

export function SeletorStatus({
  entradaId,
  status,
}: {
  entradaId: string;
  status: StatusDaEstante;
})
{
  const roteador = useRouter();
  const t = useTranslations("estante");
  const c = useTranslations("comum");
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
        aria-label={t("seletorStatus")}
        className="rounded-md border border-borda bg-superficie px-2 py-1.5 text-sm outline-none focus:border-acento disabled:opacity-60"
      >
        {STATUS.map(function (valor)
        {
          return (
            <option key={valor} value={valor}>
              {c(`status.${valor}`)}
            </option>
          );
        })}
      </select>
      {erro && (
        <span role="alert" className="text-xs text-texto-suave">
          {t("erros.acao")}
        </span>
      )}
    </div>
  );
}
