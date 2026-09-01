"use client";

/**
 * Nota e resenha estilo Letterboxd: estrelas de meia em meia, resenha com
 * flag de spoiler. Uma avaliação por obra, editável; remover apaga de vez.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

type Avaliacao = {
  rating: string | null;
  review: string | null;
  containsSpoilers: boolean;
};

export function Avaliar({
  entradaId,
  avaliacao,
}: {
  entradaId: string;
  avaliacao: Avaliacao | null;
})
{
  const roteador = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nota, setNota] = useState<number | null>(
    avaliacao?.rating === null || avaliacao === null ? null : Number(avaliacao.rating),
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
          entradaId,
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
      const resposta = await fetch(`/api/v1/avaliacoes/${entradaId}`, {
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
              {estrelas(Number(avaliacao.rating))}
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

/** Meia estrela por clique: cada estrela tem duas metades clicáveis. */
function SeletorDeEstrelas({
  nota,
  aoEscolher,
}: {
  nota: number | null;
  aoEscolher: (nota: number | null) => void;
})
{
  return (
    <div className="flex items-center gap-2">
      <div role="group" aria-label="Nota de 0,5 a 5" className="flex">
        {[1, 2, 3, 4, 5].map(function (estrela)
        {
          const cheia = nota !== null && nota >= estrela;
          const metade = nota !== null && nota === estrela - 0.5;

          return (
            <span key={estrela} className="relative text-xl leading-none">
              <span aria-hidden className={cheia ? "text-acento" : "text-borda"}>
                ★
              </span>
              {metade && (
                <span
                  aria-hidden
                  className="absolute inset-0 w-1/2 overflow-hidden text-acento"
                >
                  ★
                </span>
              )}
              <button
                type="button"
                aria-label={`${estrela - 0.5} estrelas`}
                onClick={function () { aoEscolher(estrela - 0.5); }}
                className="absolute inset-y-0 left-0 w-1/2"
              />
              <button
                type="button"
                aria-label={`${estrela} estrelas`}
                onClick={function () { aoEscolher(estrela); }}
                className="absolute inset-y-0 right-0 w-1/2"
              />
            </span>
          );
        })}
      </div>
      <span className="text-xs tabular-nums text-texto-suave">
        {nota === null ? "sem nota" : nota.toLocaleString("pt-BR")}
      </span>
      {nota !== null && (
        <button
          type="button"
          onClick={function () { aoEscolher(null); }}
          className="text-xs text-texto-suave underline underline-offset-4"
        >
          limpar
        </button>
      )}
    </div>
  );
}

function estrelas(nota: number): string
{
  const cheias = Math.floor(nota);

  return "★".repeat(cheias) + (nota % 1 !== 0 ? "½" : "");
}
