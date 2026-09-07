"use client";

/**
 * Editar nome e descrição da própria lista (issue #51): o cabeçalho vira um
 * formulário inline, salva com PATCH e recarrega.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EditarLista({
  listaId,
  nome,
  descricao,
}: {
  listaId: string;
  nome: string;
  descricao: string | null;
})
{
  const roteador = useRouter();
  const [editando, setEditando] = useState(false);
  const [novoNome, setNovoNome] = useState(nome);
  const [novaDescricao, setNovaDescricao] = useState(descricao ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function salvar(evento: React.FormEvent)
  {
    evento.preventDefault();
    setOcupado(true);
    setErro(null);

    try
    {
      const resposta = await fetch(`/api/v1/listas/${listaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome, descricao: novaDescricao }),
      });

      if (!resposta.ok)
      {
        const corpo = (await resposta.json().catch(function () { return null; })) as
          | { erros?: Record<string, string> }
          | null;
        setErro(corpo?.erros?.nome ?? corpo?.erros?._geral ?? "não foi possível salvar");
        return;
      }

      setEditando(false);
      roteador.refresh();
    }
    finally
    {
      setOcupado(false);
    }
  }

  if (!editando)
  {
    return (
      <button
        type="button"
        onClick={function () { setEditando(true); }}
        className="text-sm text-texto-suave underline underline-offset-4 hover:text-texto"
      >
        Editar
      </button>
    );
  }

  return (
    <form onSubmit={salvar} className="flex w-full max-w-xl flex-col gap-2">
      <input
        value={novoNome}
        onChange={function (e) { setNovoNome(e.target.value); }}
        maxLength={100}
        required
        aria-label="Nome da lista"
        className="rounded-md border border-borda bg-superficie px-3 py-2 font-marca text-xl font-bold text-texto outline-none focus:border-acento"
      />
      <textarea
        value={novaDescricao}
        onChange={function (e) { setNovaDescricao(e.target.value); }}
        maxLength={2000}
        rows={2}
        placeholder="Descrição (opcional)"
        aria-label="Descrição da lista"
        className="rounded-md border border-borda bg-superficie px-3 py-2 text-sm text-texto outline-none focus:border-acento"
      />
      {erro && <p className="text-xs text-acento">{erro}</p>}
      <div className="flex items-center gap-3 text-sm">
        <button
          type="submit"
          disabled={ocupado}
          className="rounded-md bg-acento px-3 py-1.5 text-acento-contraste disabled:opacity-60"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={function ()
          {
            setEditando(false);
            setNovoNome(nome);
            setNovaDescricao(descricao ?? "");
            setErro(null);
          }}
          className="text-texto-suave hover:text-texto"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
