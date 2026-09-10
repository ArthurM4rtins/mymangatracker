"use client";

/**
 * O "+" de cada resultado da busca da lista (#237). POST adiciona; a página
 * recarrega e a obra aparece na grade. Obra já na lista mostra a marca, sem botão.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";

export function AdicionarItem({
  listaId,
  chave,
  jaNaLista,
}: {
  listaId: string;
  chave: string;
  jaNaLista: boolean;
})
{
  const roteador = useRouter();
  const t = useTranslations("listas");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar()
  {
    setOcupado(true);
    setErro(null);

    try
    {
      const resposta = await fetch(`/api/v1/listas/${listaId}/itens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obra: chave }),
      });

      if (resposta.status === 401)
      {
        roteador.push("/entrar");
        return;
      }

      if (resposta.status === 422)
      {
        setErro(t("detalhe.busca.erros.cheia"));
        return;
      }

      if (resposta.status === 429)
      {
        setErro(t("detalhe.busca.erros.limite"));
        return;
      }

      if (resposta.status === 503)
      {
        setErro(t("detalhe.busca.erros.indisponivel"));
        return;
      }

      if (!resposta.ok)
      {
        setErro(t("detalhe.busca.erros.geral"));
        return;
      }

      roteador.refresh();
    }
    catch
    {
      setErro(t("detalhe.busca.erros.geral"));
    }
    finally
    {
      setOcupado(false);
    }
  }

  if (jaNaLista)
  {
    return (
      <span className="text-xs text-acento">{t("detalhe.busca.jaNaLista")}</span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      {erro && (
        <span role="alert" className="text-xs text-texto-suave">{erro}</span>
      )}
      <button
        type="button"
        onClick={function () { void adicionar(); }}
        disabled={ocupado}
        className="rounded-md border border-borda px-2 py-1 text-xs text-acento transition-colors hover:bg-superficie disabled:opacity-60"
      >
        {t("detalhe.busca.adicionar")}
      </button>
    </span>
  );
}
