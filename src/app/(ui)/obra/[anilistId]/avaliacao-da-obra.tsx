"use client";

/**
 * A avaliação na página da obra, no jeito Letterboxd (issue #45): estrelas
 * soltas que SALVAM no clique, e a resenha num modal aberto pelo botão
 * "Resenhar…" — com capa, título e a nota já puxada.
 *
 * O modal é uma edição transacional (issue #62): nota, texto e spoiler
 * editados lá vivem num rascunho próprio e só chegam ao servidor (e às
 * estrelas de fora) no "Salvar". Fechar descarta tudo. A estrela de fora
 * persiste sempre a resenha JÁ SALVA, nunca um rascunho abandonado.
 */
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SeletorDeEstrelas } from "../../componentes/estrelas";

type Avaliacao = {
  rating: string | null;
  review: string | null;
  containsSpoilers: boolean;
};

type Rascunho = {
  nota: number | null;
  resenha: string;
  spoilers: boolean;
};

export function AvaliacaoDaObra({
  anilistId,
  titulo,
  ano,
  coverImageUrl,
  avaliacao,
}: {
  anilistId: number;
  titulo: string;
  ano: number | null;
  coverImageUrl: string | null;
  avaliacao: Avaliacao | null;
})
{
  const roteador = useRouter();
  const [nota, setNota] = useState<number | null>(
    avaliacao?.rating == null ? null : Number(avaliacao.rating),
  );
  const [modalAberto, setModalAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // O que está no servidor. Vem das props: o refresh depois de salvar atualiza.
  const resenhaSalva = avaliacao?.review ?? "";
  const spoilersSalvos = avaliacao?.containsSpoilers ?? false;

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

    const salvou = await persistir({
      rating: nova,
      review: resenhaSalva,
      containsSpoilers: spoilersSalvos,
    });

    if (!salvou)
    {
      setNota(anterior);
    }
  }

  async function salvarDoModal(rascunho: Rascunho)
  {
    const salvou = await persistir({
      rating: rascunho.nota,
      review: rascunho.resenha,
      containsSpoilers: rascunho.spoilers,
    });

    if (salvou)
    {
      setNota(rascunho.nota);
      setModalAberto(false);
    }
  }

  return (
    <section className="flex w-full flex-col gap-3 rounded-lg border border-borda bg-superficie p-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
        Sua avaliação
      </h2>

      <SeletorDeEstrelas
        nota={nota}
        aoEscolher={function (n) { void mudarNota(n); }}
        tamanho="text-2xl"
      />

      <button
        type="button"
        onClick={function () { setModalAberto(true); }}
        className="w-fit rounded-md border border-borda px-3 py-1.5 text-sm text-texto transition-colors hover:border-acento"
      >
        {avaliacao?.review ? "Editar resenha…" : "Resenhar…"}
      </button>

      {aviso && (
        <p role="alert" className="text-xs text-texto-suave">
          {aviso}
        </p>
      )}

      {modalAberto && (
        <ModalDeResenha
          titulo={titulo}
          ano={ano}
          coverImageUrl={coverImageUrl}
          inicial={{ nota, resenha: resenhaSalva, spoilers: spoilersSalvos }}
          ocupado={ocupado}
          aoSalvar={function (rascunho) { void salvarDoModal(rascunho); }}
          aoFechar={function () { setModalAberto(false); }}
        />
      )}
    </section>
  );
}

function ModalDeResenha({
  titulo,
  ano,
  coverImageUrl,
  inicial,
  ocupado,
  aoSalvar,
  aoFechar,
}: {
  titulo: string;
  ano: number | null;
  coverImageUrl: string | null;
  inicial: Rascunho;
  ocupado: boolean;
  aoSalvar: (rascunho: Rascunho) => void;
  aoFechar: () => void;
})
{
  // Rascunho local: nasce do que está salvo quando o modal abre e morre com ele.
  const [nota, setNota] = useState<number | null>(inicial.nota);
  const [resenha, setResenha] = useState(inicial.resenha);
  const [spoilers, setSpoilers] = useState(inicial.spoilers);

  useEffect(function ()
  {
    function aoTeclar(evento: KeyboardEvent)
    {
      if (evento.key === "Escape")
      {
        aoFechar();
      }
    }

    document.addEventListener("keydown", aoTeclar);

    return function ()
    {
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aoFechar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Resenhar ${titulo}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        aria-hidden
        onClick={aoFechar}
        className="absolute inset-0 bg-black/60"
      />

      <div className="relative flex w-full max-w-lg flex-col gap-4 rounded-lg border border-borda bg-superficie p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {coverImageUrl && (
              <Image
                src={coverImageUrl}
                alt=""
                width={64}
                height={96}
                className="h-24 w-16 shrink-0 rounded object-cover"
                unoptimized
              />
            )}
            <div className="flex flex-col gap-1">
              <p className="font-marca text-lg font-bold leading-snug">
                {titulo}
                {ano !== null && (
                  <span className="ml-2 font-normal text-texto-suave">{ano}</span>
                )}
              </p>
              <SeletorDeEstrelas nota={nota} aoEscolher={setNota} />
            </div>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="text-texto-suave hover:text-texto"
          >
            ✕
          </button>
        </div>

        <textarea
          value={resenha}
          onChange={function (evento) { setResenha(evento.target.value); }}
          placeholder="Escreva a resenha — ela fica pública para outros leitores"
          rows={6}
          autoFocus
          className="rounded-md border border-borda bg-fundo px-2 py-1.5 text-sm outline-none focus:border-acento"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
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
            onClick={function () { aoSalvar({ nota, resenha, spoilers }); }}
            disabled={ocupado}
            className="rounded-md bg-acento px-4 py-1.5 text-sm font-medium text-acento-contraste disabled:opacity-60"
          >
            {ocupado ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
