"use client";

/**
 * O capítulo em leitura, editável no lugar. Correção manual do dono: seta
 * direto, inclusive para trás — diferente de abrir capítulo, que nunca regride.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EditarProgresso({
  entradaId,
  progressChapter,
}: {
  entradaId: string;
  progressChapter: string | null;
})
{
  const roteador = useRouter();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(progressChapter ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(false);

  async function salvar()
  {
    const capitulo = Number(valor.replace(",", "."));

    if (!Number.isFinite(capitulo) || capitulo <= 0)
    {
      setErro(true);
      return;
    }

    setOcupado(true);
    setErro(false);

    try
    {
      const resposta = await fetch(`/api/v1/estante/${entradaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capitulo }),
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

      setEditando(false);
      roteador.refresh();
    }
    catch
    {
      setErro(true);
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
        onClick={function () { setValor(progressChapter ?? ""); setEditando(true); }}
        title="Editar capítulo"
        className="tabular-nums underline decoration-dotted underline-offset-4 hover:text-texto"
      >
        {progressChapter === null ? "marcar capítulo" : `no cap. ${progressChapter}`}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      no cap.
      <input
        type="text"
        inputMode="decimal"
        value={valor}
        onChange={function (evento) { setValor(evento.target.value); }}
        onKeyDown={function (evento) { if (evento.key === "Enter") { void salvar(); } }}
        aria-label="Capítulo em leitura"
        autoFocus
        className={`w-14 rounded-md border bg-superficie px-1.5 py-0.5 text-xs text-texto outline-none focus:border-acento ${erro ? "border-red-500" : "border-borda"}`}
      />
      <button
        type="button"
        onClick={function () { void salvar(); }}
        disabled={ocupado}
        className="text-acento underline underline-offset-4 disabled:opacity-60"
      >
        salvar
      </button>
      <button
        type="button"
        onClick={function () { setEditando(false); setErro(false); }}
        className="text-texto-suave hover:text-texto"
      >
        cancelar
      </button>
    </span>
  );
}
