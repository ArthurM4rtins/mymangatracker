"use client";

/**
 * A avaliação na página da obra (issue #45): nota e resenha separadas, sem
 * exigir a obra na estante. Clicar na estrela SALVA a nota na hora; a resenha
 * tem a própria caixa, sempre aberta, com o próprio salvar.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SeletorDeEstrelas } from "../../componentes/estrelas";

type Avaliacao = {
  rating: string | null;
  review: string | null;
  containsSpoilers: boolean;
};

export function AvaliacaoDaObra({
  anilistId,
  avaliacao,
}: {
  anilistId: number;
  avaliacao: Avaliacao | null;
})
{
  const roteador = useRouter();
  const [nota, setNota] = useState<number | null>(
    avaliacao?.rating == null ? null : Number(avaliacao.rating),
  );
  const [resenha, setResenha] = useState(avaliacao?.review ?? "");
  const [spoilers, setSpoilers] = useState(avaliacao?.containsSpoilers ?? false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function persistir(dados: {
    rating: number | null;
    review: string;
    containsSpoilers: boolean;
  }): Promise<boolean>
  {
    const review = dados.review.trim() === "" ? null : dados.review;

    setOcupado(true);
    setAviso(null);

    try
    {
      // Nota e resenha vazias = avaliação não existe mais.
      const resposta =
        dados.rating === null && review === null
          ? await fetch(`/api/v1/avaliacoes/${anilistId}`, { method: "DELETE" })
          : await fetch("/api/v1/avaliacoes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                anilistId,
                rating: dados.rating,
                review,
                containsSpoilers: dados.containsSpoilers,
              }),
            });

      if (resposta.status === 401)
      {
        roteador.push("/entrar");
        return false;
      }

      if (!resposta.ok && resposta.status !== 404)
      {
        setAviso("não deu para salvar — tente de novo");
        return false;
      }

      roteador.refresh();
      return true;
    }
    catch
    {
      setAviso("não deu agora — tente de novo");
      return false;
    }
    finally
    {
      setOcupado(false);
    }
  }

  async function mudarNota(nova: number | null)
  {
    const anterior = nota;
    setNota(nova);

    const salvou = await persistir({ rating: nova, review: resenha, containsSpoilers: spoilers });

    if (!salvou)
    {
      setNota(anterior);
    }
  }

  function salvarResenha()
  {
    void persistir({ rating: nota, review: resenha, containsSpoilers: spoilers });
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
        Sua avaliação
      </h2>

      <SeletorDeEstrelas nota={nota} aoEscolher={function (n) { void mudarNota(n); }} tamanho="text-2xl" />

      <div className="flex flex-col gap-2">
        <textarea
          value={resenha}
          onChange={function (evento) { setResenha(evento.target.value); }}
          placeholder="Escreva a resenha — ela fica pública para outros leitores"
          rows={4}
          className="rounded-md border border-borda bg-fundo px-2 py-1.5 text-sm outline-none focus:border-acento"
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-texto-suave">
            <input
              type="checkbox"
              checked={spoilers}
              onChange={function (evento) { setSpoilers(evento.target.checked); }}
            />
            contém spoiler
          </label>
          <button
            type="button"
            onClick={salvarResenha}
            disabled={ocupado}
            className="rounded-md bg-acento px-3 py-1 text-sm font-medium text-acento-contraste disabled:opacity-60"
          >
            {ocupado ? "Salvando…" : "Salvar resenha"}
          </button>
        </div>
      </div>

      {aviso && (
        <p role="alert" className="text-xs text-texto-suave">
          {aviso}
        </p>
      )}
    </section>
  );
}
