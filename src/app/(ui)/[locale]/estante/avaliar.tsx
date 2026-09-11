"use client";

/**
 * Nota e resenha no card da estante. Desde a issue #45 a avaliação é por
 * obra (anilistId) e não exige entrada — aqui só muda o endereço.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { SeletorDeEstrelas, estrelasTexto } from "../componentes/estrelas";

type Avaliacao = {
  rating: string | null;
  review: string | null;
  containsSpoilers: boolean;
};

export function Avaliar({
  chave,
  avaliacao,
}: {
  chave: string;
  avaliacao: Avaliacao | null;
})
{
  const roteador = useRouter();
  const t = useTranslations("estante");
  const c = useTranslations("comum");
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
      setErro(t("erros.avaliacaoVazia"));
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
          obra: chave,
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
        setErro(t("erros.salvar"));
        return;
      }

      setAberto(false);
      roteador.refresh();
    }
    catch
    {
      setErro(t("erros.rede"));
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
      const resposta = await fetch(`/api/v1/avaliacoes/${encodeURIComponent(chave)}`, {
        method: "DELETE",
      });

      if (!resposta.ok && resposta.status !== 404)
      {
        setErro(t("erros.remover"));
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
      setErro(t("erros.rede"));
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
            <span
              aria-label={t("avaliacao.nota", { nota: avaliacao.rating })}
              className="text-sm text-acento"
            >
              {estrelasTexto(Number(avaliacao.rating))}
            </span>
          )}
          <button
            type="button"
            onClick={function () { setAberto(true); }}
            className="text-sm text-acento underline underline-offset-4"
          >
            {avaliacao === null ? t("avaliacao.avaliar") : t("avaliacao.editar")}
          </button>
        </div>

        {avaliacao?.review != null && (
          avaliacao.containsSpoilers && !mostrarSpoiler ? (
            <button
              type="button"
              onClick={function () { setMostrarSpoiler(true); }}
              className="w-fit text-xs text-texto-suave underline underline-offset-4"
            >
              {t("avaliacao.spoilerOculto")}
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
        placeholder={t("avaliacao.resenha")}
        rows={4}
        className="rounded-md border border-borda bg-superficie px-2 py-1.5 text-sm text-texto outline-none focus:border-acento"
      />

      <label className="flex items-center gap-2 text-xs text-texto-suave">
        <input
          type="checkbox"
          checked={spoilers}
          onChange={function (evento) { setSpoilers(evento.target.checked); }}
        />
        {t("avaliacao.spoiler")}
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
          {ocupado ? c("salvando") : c("salvar")}
        </button>
        {avaliacao !== null && (
          <button
            type="button"
            onClick={function () { void remover(); }}
            disabled={ocupado}
            className="text-sm text-texto-suave underline underline-offset-4 disabled:opacity-60"
          >
            {t("avaliacao.remover")}
          </button>
        )}
        <button
          type="button"
          onClick={function () { setAberto(false); setErro(null); }}
          className="text-sm text-texto-suave hover:text-texto"
        >
          {c("cancelar")}
        </button>
      </div>
    </div>
  );
}
