"use client";

/**
 * Uma resenha pública: curtir (toggle otimista), comentários tipo chat e
 * spoiler escondido por padrão. Quem escreveu aparece pelo username.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Avatar } from "../../componentes/avatar";
import { estrelasTexto } from "../../componentes/estrelas";

export type ReviewParaTela = {
  entryId: string;
  username: string;
  avatarVersao: number | null;
  minha: boolean;
  rating: string | null;
  review: string;
  containsSpoilers: boolean;
  curtidas: number;
  curtiPorMim: boolean;
  /** Os mais recentes; o resto vem por "ver anteriores" (#109). */
  comentarios: ComentarioParaTela[];
  totalDeComentarios: number;
};

type ComentarioParaTela = {
  id: string;
  username: string;
  avatarVersao: number | null;
  texto: string;
  criadoEm: Date;
  meu: boolean;
};

export function ReviewSocial({
  review,
  logado,
}: {
  review: ReviewParaTela;
  logado: boolean;
})
{
  const t = useTranslations("obra");
  const roteador = useRouter();
  const [curtida, setCurtida] = useState(review.curtiPorMim);
  const [total, setTotal] = useState(review.curtidas);
  const [mostrarSpoiler, setMostrarSpoiler] = useState(false);
  const [comentario, setComentario] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Páginas anteriores já carregadas. Os recentes vêm das props (o refresh
  // depois de comentar atualiza); a lista exibida é a união, sem repetir.
  const [anteriores, setAnteriores] = useState<ComentarioParaTela[]>([]);
  const [carregandoAnteriores, setCarregandoAnteriores] = useState(false);

  const vistos = new Set<string>();
  const conversa = [...anteriores, ...review.comentarios].filter(function (item)
  {
    if (vistos.has(item.id))
    {
      return false;
    }

    vistos.add(item.id);
    return true;
  });
  const faltam = review.totalDeComentarios - conversa.length;

  async function verAnteriores()
  {
    const primeiro = conversa[0];

    if (primeiro === undefined || carregandoAnteriores)
    {
      return;
    }

    setCarregandoAnteriores(true);

    try
    {
      const resposta = await fetch(
        `/api/v1/reviews/${review.entryId}/comentarios?antesDe=${encodeURIComponent(primeiro.id)}`,
      );

      if (!resposta.ok)
      {
        return;
      }

      const corpo: { comentarios: Array<Omit<ComentarioParaTela, "criadoEm"> & { criadoEm: string }> } =
        await resposta.json();

      setAnteriores(function (atuais)
      {
        return [
          ...corpo.comentarios.map(function (item)
          {
            return { ...item, criadoEm: new Date(item.criadoEm) };
          }),
          ...atuais,
        ];
      });
    }
    finally
    {
      setCarregandoAnteriores(false);
    }
  }

  async function curtir()
  {
    if (!logado)
    {
      roteador.push("/entrar");
      return;
    }

    // Um toggle por vez: dois cliques em voo desfaziam um ao outro (#65, item 5).
    if (ocupado)
    {
      return;
    }

    setOcupado(true);

    // Otimista: inverte já; a resposta corrige se divergir.
    setCurtida(!curtida);
    setTotal(curtida ? total - 1 : total + 1);

    try
    {
      const resposta = await fetch(`/api/v1/reviews/${review.entryId}/curtida`, {
        method: "POST",
      });

      if (resposta.status === 401)
      {
        roteador.push("/entrar");
        return;
      }

      if (resposta.ok)
      {
        const corpo = await resposta.json();
        setCurtida(corpo.curtida);
        setTotal(corpo.total);
      }
      else
      {
        setCurtida(curtida);
        setTotal(total);
      }
    }
    catch
    {
      setCurtida(curtida);
      setTotal(total);
    }
    finally
    {
      setOcupado(false);
    }
  }

  async function comentar()
  {
    if (comentario.trim() === "")
    {
      return;
    }

    setOcupado(true);
    setErro(null);

    try
    {
      const resposta = await fetch(
        `/api/v1/reviews/${review.entryId}/comentarios`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto: comentario }),
        },
      );

      if (resposta.status === 401)
      {
        roteador.push("/entrar");
        return;
      }

      if (resposta.status === 429)
      {
        setErro(t("erros.limite"));
        return;
      }

      if (!resposta.ok)
      {
        setErro(t("erros.comentar"));
        return;
      }

      setComentario("");
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

  async function apagar(comentarioId: string)
  {
    try
    {
      await fetch(`/api/v1/comentarios/${comentarioId}`, { method: "DELETE" });
      roteador.refresh();
    }
    catch
    {
      // Falhou em silêncio: o refresh da próxima ação resolve.
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-borda bg-superficie p-4">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/u/${review.username}`} className="flex items-center gap-2 font-medium hover:text-acento">
          <Avatar username={review.username} versao={review.avatarVersao} />
          {review.username}
        </Link>
        {review.minha && (
          <span className="rounded-full border border-borda px-2 py-0.5 text-xs text-texto-suave">
            {t("resenhas.minha")}
          </span>
        )}
        {review.rating !== null && (
          <span aria-label={t("resenhas.nota", { nota: review.rating })} className="text-acento">
            {estrelasTexto(Number(review.rating))}
          </span>
        )}
      </p>

      {review.containsSpoilers && !mostrarSpoiler ? (
        <button
          type="button"
          onClick={function () { setMostrarSpoiler(true); }}
          className="w-fit text-sm text-texto-suave underline underline-offset-4"
        >
          {t("resenhas.spoiler")}
        </button>
      ) : (
        <p className="whitespace-pre-line text-sm leading-relaxed">{review.review}</p>
      )}

      <div className="flex items-center gap-4 text-sm text-texto-suave">
        <button
          type="button"
          onClick={function () { void curtir(); }}
          aria-pressed={curtida}
          className={`transition-colors hover:text-acento ${curtida ? "text-acento" : ""}`}
        >
          {curtida ? "♥" : "♡"} {total}
        </button>
        <span>
          {t("contagem.comentarios", { n: review.totalDeComentarios })}
        </span>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-texto-suave hover:text-texto">
          {review.totalDeComentarios > 0 ? t("resenhas.verConversa") : t("resenhas.comentar")}
        </summary>

        <div className="mt-2 flex flex-col gap-2 border-l border-borda pl-3">
          {faltam > 0 && (
            <button
              type="button"
              onClick={function () { void verAnteriores(); }}
              disabled={carregandoAnteriores}
              className="w-fit text-xs text-texto-suave underline underline-offset-4 disabled:opacity-60"
            >
              {carregandoAnteriores
                ? t("resenhas.carregando")
                : t("resenhas.verAnteriores", { n: faltam })}
            </button>
          )}
          {conversa.map(function (item)
          {
            return (
              <p key={item.id} className="flex items-start gap-2">
                <Link
                  href={`/u/${item.username}`}
                  className="flex shrink-0 items-center gap-1.5 font-medium hover:text-acento"
                >
                  <Avatar username={item.username} versao={item.avatarVersao} tamanho="sm" />
                  {item.username}
                </Link>
                <span className="min-w-0 flex-1 whitespace-pre-line text-texto-suave">
                  {item.texto}
                </span>
                {item.meu && (
                  <button
                    type="button"
                    onClick={function () { void apagar(item.id); }}
                    aria-label={t("resenhas.apagarComentario")}
                    className="text-xs text-texto-suave underline underline-offset-4"
                  >
                    {t("resenhas.apagar")}
                  </button>
                )}
              </p>
            );
          })}

          {logado ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={comentario}
                onChange={function (evento) { setComentario(evento.target.value); }}
                onKeyDown={function (evento)
                {
                  if (evento.key === "Enter")
                  {
                    void comentar();
                  }
                }}
                placeholder={t("resenhas.placeholderComentario")}
                maxLength={2000}
                className="min-w-0 flex-1 rounded-md border border-borda bg-fundo px-2 py-1.5 text-sm outline-none focus:border-acento"
              />
              <button
                type="button"
                onClick={function () { void comentar(); }}
                disabled={ocupado || comentario.trim() === ""}
                className="text-acento underline underline-offset-4 disabled:opacity-60"
              >
                {t("resenhas.enviar")}
              </button>
            </div>
          ) : (
            <p className="text-xs text-texto-suave">{t("resenhas.entreParaComentar")}</p>
          )}

          {erro && (
            <p role="alert" className="text-xs text-texto-suave">
              {erro}
            </p>
          )}
        </div>
      </details>
    </li>
  );
}

