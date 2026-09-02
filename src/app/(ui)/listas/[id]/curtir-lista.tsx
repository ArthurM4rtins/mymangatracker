"use client";

/**
 * Curtir a lista (issue #51): toggle otimista, mesmo jeito da resenha. Sem
 * sessão, leva para /entrar.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CurtirLista({
  listaId,
  curtidas,
  curtiPorMim,
  logado,
}: {
  listaId: string;
  curtidas: number;
  curtiPorMim: boolean;
  logado: boolean;
})
{
  const roteador = useRouter();
  const [total, setTotal] = useState(curtidas);
  const [curti, setCurti] = useState(curtiPorMim);
  const [ocupado, setOcupado] = useState(false);

  async function alternar()
  {
    if (!logado)
    {
      roteador.push("/entrar");
      return;
    }

    const antes = { total, curti };
    setCurti(!curti);
    setTotal(curti ? total - 1 : total + 1);
    setOcupado(true);

    try
    {
      const resposta = await fetch(`/api/v1/listas/${listaId}/curtida`, { method: "POST" });

      if (!resposta.ok)
      {
        setCurti(antes.curti);
        setTotal(antes.total);
        return;
      }

      const corpo = (await resposta.json()) as { curtida: boolean; total: number };
      setCurti(corpo.curtida);
      setTotal(corpo.total);
    }
    catch
    {
      setCurti(antes.curti);
      setTotal(antes.total);
    }
    finally
    {
      setOcupado(false);
    }
  }

  return (
    <button
      type="button"
      onClick={function () { void alternar(); }}
      disabled={ocupado}
      aria-pressed={curti}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-60 ${
        curti ? "border-acento text-acento" : "border-borda text-texto-suave hover:text-texto"
      }`}
    >
      <span aria-hidden>{curti ? "♥" : "♡"}</span>
      <span className="tabular-nums">{total}</span>
      <span className="sr-only">{curti ? "descurtir" : "curtir"} a lista</span>
    </button>
  );
}
