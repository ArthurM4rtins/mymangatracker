"use client";

/**
 * O clique que faz o progresso existir: pede a abertura ao servidor (que
 * resolve a URL e grava o histórico) e abre o capítulo em nova aba.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ContinuarLeitura({
  entradaId,
  proximoCapitulo,
  compacto = false,
}: {
  entradaId: string;
  proximoCapitulo: number;
  /** Na home o card é pequeno: só o botão principal, sem capítulo manual. */
  compacto?: boolean;
})
{
  const roteador = useRouter();
  const [capituloManual, setCapituloManual] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function abrir(capitulo?: number)
  {
    setOcupado(true);
    setErro(null);

    try
    {
      const resposta = await fetch("/api/v1/progresso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          capitulo === undefined ? { entradaId } : { entradaId, capitulo },
        ),
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

      window.open(corpo.url, "_blank", "noopener,noreferrer");
      setCapituloManual("");
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

  function abrirManual()
  {
    const numero = Number(capituloManual.replace(",", "."));

    if (!Number.isFinite(numero) || numero <= 0)
    {
      setErro("capítulo inválido");
      return;
    }

    void abrir(numero);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={function () { void abrir(); }}
          disabled={ocupado}
          className="rounded-md bg-acento px-3 py-1.5 text-sm font-medium text-acento-contraste disabled:opacity-60"
        >
          {ocupado ? "Abrindo…" : `Continuar cap. ${proximoCapitulo} →`}
        </button>

        {!compacto && (
        <span className="flex items-center gap-1 text-xs text-texto-suave">
          ou cap.
          <input
            type="text"
            inputMode="decimal"
            value={capituloManual}
            onChange={function (evento) { setCapituloManual(evento.target.value); }}
            aria-label="Capítulo específico"
            className="w-14 rounded-md border border-borda bg-superficie px-1.5 py-1 text-sm text-texto outline-none focus:border-acento"
          />
          <button
            type="button"
            onClick={abrirManual}
            disabled={ocupado || capituloManual.trim() === ""}
            className="text-acento underline underline-offset-4 disabled:opacity-60"
          >
            abrir
          </button>
        </span>
        )}
      </div>

      {erro && (
        <p role="alert" className="text-xs text-texto-suave">
          {erro}
        </p>
      )}
    </div>
  );
}
