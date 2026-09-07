"use client";

/**
 * O botão de listas da página da obra: abre as listas do usuário com o
 * "já contém" marcado; clicar alterna a obra (entra/sai).
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

type MinhaLista = {
  listaId: string;
  nome: string;
  jaContem: boolean;
};

export function AdicionarALista({ anilistId }: { anilistId: number })
{
  const roteador = useRouter();
  const [aberto, setAberto] = useState(false);
  const [listas, setListas] = useState<MinhaLista[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function abrir()
  {
    setAberto(true);
    setErro(null);

    try
    {
      const resposta = await fetch(`/api/v1/listas?anilistId=${anilistId}`);

      if (resposta.status === 401)
      {
        roteador.push("/entrar");
        return;
      }

      if (!resposta.ok)
      {
        setErro("não deu para carregar as listas");
        return;
      }

      const corpo = await resposta.json();
      setListas(corpo.listas);
    }
    catch
    {
      setErro("não deu agora — tente de novo");
    }
  }

  async function alternar(lista: MinhaLista)
  {
    try
    {
      const resposta = await fetch(`/api/v1/listas/${lista.listaId}/itens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anilistId }),
      });

      if (!resposta.ok)
      {
        return;
      }

      const corpo = await resposta.json();
      setListas(function (atuais)
      {
        return (atuais ?? []).map(function (item)
        {
          return item.listaId === lista.listaId
            ? { ...item, jaContem: corpo.contem }
            : item;
        });
      });
    }
    catch
    {
      // Sem drama: o estado local fica como estava.
    }
  }

  if (!aberto)
  {
    return (
      <button
        type="button"
        onClick={function () { void abrir(); }}
        className="text-sm text-acento underline underline-offset-4"
      >
        + Lista
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-borda bg-fundo p-3 text-sm">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs uppercase tracking-wide text-texto-suave">
          Minhas listas
        </span>
        <button
          type="button"
          onClick={function () { setAberto(false); }}
          className="text-xs text-texto-suave hover:text-texto"
        >
          fechar
        </button>
      </div>

      {erro && (
        <p role="alert" className="text-xs text-texto-suave">
          {erro}
        </p>
      )}

      {listas !== null && listas.length === 0 && (
        <p className="text-xs text-texto-suave">
          Nenhuma lista ainda — crie uma na página de Listas.
        </p>
      )}

      {listas?.map(function (lista)
      {
        return (
          <button
            key={lista.listaId}
            type="button"
            onClick={function () { void alternar(lista); }}
            className="flex items-center justify-between gap-3 rounded-md px-2 py-1 text-left transition-colors hover:bg-superficie"
          >
            <span className="min-w-0 flex-1 truncate">{lista.nome}</span>
            <span aria-hidden className={lista.jaContem ? "text-acento" : "text-borda"}>
              {lista.jaContem ? "✓" : "+"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
