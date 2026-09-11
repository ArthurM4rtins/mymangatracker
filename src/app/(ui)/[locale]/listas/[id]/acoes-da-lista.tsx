"use client";

/**
 * Ação do dono na página da lista: apagar a lista.
 *
 * Remover uma obra saiu daqui (#242): virou rascunho na prateleira, aplicado
 * pelo Salvar, e o botão de dois passos deixou de fazer sentido.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";

export function ApagarLista({ listaId }: { listaId: string })
{
  const roteador = useRouter();
  const t = useTranslations("listas");
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
        {t("detalhe.apagar.abrir")}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-texto-suave">{t("detalhe.apagar.confirmacao")}</span>
      <button
        type="button"
        onClick={function () { void apagar(); }}
        disabled={ocupado}
        className="text-acento underline underline-offset-4 disabled:opacity-60"
      >
        {t("detalhe.apagar.sim")}
      </button>
      <button
        type="button"
        onClick={function () { setConfirmando(false); }}
        className="text-texto-suave hover:text-texto"
      >
        {t("detalhe.apagar.nao")}
      </button>
    </span>
  );
}
