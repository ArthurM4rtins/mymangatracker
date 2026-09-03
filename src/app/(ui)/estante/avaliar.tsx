"use client";

/**
 * Nota e resenha no card da estante. Desde a issue #45 a avaliação é por
 * obra (anilistId) e não exige entrada — aqui só muda o endereço.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SeletorDeEstrelas, estrelasTexto } from "../componentes/estrelas";

type Avaliacao = {
  rating: string | null;
  review: string | null;
  containsSpoilers: boolean;
};

export function Avaliar({
  anilistId,
  avaliacao,
}: {
  anilistId: number;
  avaliacao: Avaliacao | null;
})
{
  const roteador = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nota, setNota] = useState<number | null>(
    avaliacao?.rating == null ? null : Number(avaliacao.rating),
  );
  const [resenha, setResenha] = useState(avaliacao?.review ?? "");
  const [spoilers, setSpoilers] = useState(avaliacao?.containsSpoilers ?? false);
  const [mostrarSpoiler, setMostrarSpoiler] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar()
  {
    if (nota === null && resenha.trim() === "")
    {
      setErro("dá uma nota ou escreve a resenha");
      return;
    }

    setOcupado(true);
    setErro(null);

    try
    {
      const resposta = await fetch("/api/v1/avaliacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anilistId,
          rating: nota,
          review: resenha.trim() === "" ? null : resenha,
          containsSpoilers: spoilers,
        }),
      });

      if (resposta.status === 401)
      {
        roteador.push("/entrar");
        return;
      }

      if (!resposta.ok)
      {
        setErro("não deu para salvar — tente de novo");
        return;
      }

      setAberto(false);
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

  async function remover()
  {
    setOcupado(true);
    setErro(null);

    try
    {
      const resposta = await fetch(`/api/v1/avaliacoes/${anilistId}`, {
        method: "DELETE",
      });

      if (!resposta.ok && resposta.status !== 404)
      {
        setErro("não deu para remover — tente de novo");
        return;
      }

      setNota(null);
      setResenha("");
      setSpoilers(false);
      setAberto(false);
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
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {avaliacao?.rating != null && (
            <span aria-label={`Nota ${avaliacao.rating} de 5`} className="text-sm text-acento">
              {estrelasTexto(Number(avaliacao.rating))}
            </span>
          )}
          <button
            type="button"
            onClick={function () { setAberto(true); }}
            className="text-sm text-acento underline underline-offset-4"
          >
            {avaliacao === null ? "Avaliar" : "Editar avaliação"}
          </button>
        </div>

        {avaliacao?.review != null && (
          avaliacao.containsSpoilers && !mostrarSpoiler ? (
            <button
              type="button"
              onClick={function () { setMostrarSpoiler(true); }}
              className="w-fit text-xs text-texto-suave underline underline-offset-4"
            >
              resenha com spoiler — mostrar
            </button>
          ) : (
            <p className="line-clamp-3 text-sm text-texto-suave">{avaliacao.review}</p>
          )
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-borda bg-fundo p-3">
      <SeletorDeEstrelas nota={nota} aoEscolher={setNota} />

      <textarea
        value={resenha}
        onChange={function (evento) { setResenha(evento.target.value); }}
        placeholder="Escreva a resenha (opcional)"
        rows={4}
        className="rounded-md border border-borda bg-superficie px-2 py-1.5 text-sm text-texto outline-none focus:border-acento"
      />

      <label className="flex items-center gap-2 text-xs text-texto-suave">
        <input
          type="checkbox"
          checked={spoilers}
          onChange={function (evento) { setSpoilers(evento.target.checked); }}
        />
        contém spoiler
      </label>

      {erro && (
        <p role="alert" className="text-xs text-texto-suave">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={function () { void salvar(); }}
          disabled={ocupado}
          className="rounded-md bg-acento px-3 py-1 text-sm font-medium text-acento-contraste disabled:opacity-60"
        >
          {ocupado ? "Salvando…" : "Salvar"}
        </button>
        {avaliacao !== null && (
          <button
            type="button"
            onClick={function () { void remover(); }}
            disabled={ocupado}
            className="text-sm text-texto-suave underline underline-offset-4 disabled:opacity-60"
          >
            Remover
          </button>
        )}
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
