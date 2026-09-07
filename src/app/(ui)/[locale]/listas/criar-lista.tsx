"use client";

/**
 * Criar lista: nome + descrição opcional. Sucesso leva direto para a página
 * da lista nova.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CriarLista()
{
  const roteador = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar()
  {
    if (nome.trim() === "")
    {
      setErro("dá um nome para a lista");
      return;
    }

    setOcupado(true);
    setErro(null);

    try
    {
      const resposta = await fetch("/api/v1/listas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          descricao: descricao.trim() === "" ? null : descricao,
        }),
      });

      if (resposta.status === 401)
      {
        roteador.push("/entrar");
        return;
      }

      const corpo = await resposta.json();

      if (!resposta.ok)
      {
        setErro(corpo?.erros?._geral ?? "não deu — tente de novo");
        return;
      }

      roteador.push(`/listas/${corpo.listaId}`);
      roteador.refresh();
    }
    catch
    {
      setErro("não deu agora — tente de novo");
    }
    finally
    {
      setOcupado(false);
    }
  }

  if (!aberto)
  {
    return (
      <button
        type="button"
        onClick={function () { setAberto(true); }}
        className="w-fit rounded-md bg-acento px-4 py-2 text-sm font-medium text-acento-contraste"
      >
        Criar lista
      </button>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-2 rounded-lg border border-borda bg-superficie p-4">
      <input
        type="text"
        value={nome}
        onChange={function (evento) { setNome(evento.target.value); }}
        placeholder="Nome da lista"
        maxLength={100}
        autoFocus
        className="rounded-md border border-borda bg-fundo px-2 py-1.5 text-sm outline-none focus:border-acento"
      />
      <textarea
        value={descricao}
        onChange={function (evento) { setDescricao(evento.target.value); }}
        placeholder="Descrição (opcional)"
        rows={2}
        maxLength={2000}
        className="rounded-md border border-borda bg-fundo px-2 py-1.5 text-sm outline-none focus:border-acento"
      />
      {erro && (
        <p role="alert" className="text-xs text-texto-suave">
          {erro}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={function () { void criar(); }}
          disabled={ocupado}
          className="rounded-md bg-acento px-3 py-1 text-sm font-medium text-acento-contraste disabled:opacity-60"
        >
          {ocupado ? "Criando…" : "Criar"}
        </button>
        <button
          type="button"
          onClick={function () { setAberto(false); setErro(null); }}
          className="text-sm text-texto-suave hover:text-texto"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
