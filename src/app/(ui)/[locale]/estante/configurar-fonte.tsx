"use client";

/**
 * Configura a fonte de leitura: o usuário cola o link do capítulo 1, o
 * servidor deriva os candidatos e cada um volta com o link de exemplo do
 * capítulo 2 — o usuário testa e confirma. Nada é escolhido em silêncio.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

type Candidato = {
  sourceHost: string;
  urlTemplate: string;
  urlExemplo: string;
};

export function ConfigurarFonte({
  entradaId,
  temFonte,
}: {
  entradaId: string;
  temFonte: boolean;
})
{
  const roteador = useRouter();
  const t = useTranslations("estante");
  const c = useTranslations("comum");
  const [aberto, setAberto] = useState(false);
  const [url, setUrl] = useState("");
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);
  const [paginaDaObra, setPaginaDaObra] = useState<Candidato | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function derivar()
  {
    setOcupado(true);
    setErro(null);
    setCandidatos(null);
    setPaginaDaObra(null);

    try
    {
      const resposta = await fetch("/api/v1/fontes/candidatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (resposta.status === 401)
      {
        roteador.push("/entrar");
        return;
      }

      const corpo = await resposta.json();

      if (!resposta.ok)
      {
        setErro(corpo?.erros?.url ?? t("erros.derivar"));
        return;
      }

      setCandidatos(corpo.candidatos);
      setPaginaDaObra(corpo.paginaDaObra);
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

  async function confirmar(candidato: Candidato)
  {
    setOcupado(true);
    setErro(null);

    try
    {
      const resposta = await fetch("/api/v1/fontes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entradaId,
          sourceHost: candidato.sourceHost,
          urlTemplate: candidato.urlTemplate,
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
      setUrl("");
      setCandidatos(null);
      setPaginaDaObra(null);
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
      <button
        type="button"
        onClick={function () { setAberto(true); }}
        className="text-sm text-acento underline underline-offset-4"
      >
        {temFonte ? t("fonte.trocar") : t("fonte.configurar")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-borda bg-fundo p-3">
      <label className="flex flex-col gap-1 text-xs text-texto-suave">
        {t("fonte.rotuloUrl")}
        <input
          type="url"
          value={url}
          onChange={function (evento) { setUrl(evento.target.value); }}
          placeholder={t("fonte.exemploUrl")}
          className="rounded-md border border-borda bg-superficie px-2 py-1.5 text-sm text-texto outline-none focus:border-acento"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={derivar}
          disabled={ocupado || url.trim() === ""}
          className="w-fit rounded-md border border-acento px-3 py-1 text-sm text-acento transition-colors hover:bg-acento hover:text-acento-contraste disabled:opacity-60"
        >
          {ocupado ? t("fonte.derivando") : t("fonte.derivar")}
        </button>
        <button
          type="button"
          onClick={function ()
          {
            setAberto(false);
            setErro(null);
            setCandidatos(null);
            setPaginaDaObra(null);
          }}
          className="text-sm text-texto-suave hover:text-texto"
        >
          {c("cancelar")}
        </button>
      </div>

      {erro && (
        <p role="alert" className="text-xs text-texto-suave">
          {erro}
        </p>
      )}

      {candidatos && candidatos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {candidatos.map(function (candidato)
          {
            return (
              <li
                key={candidato.urlTemplate}
                className="flex flex-col gap-1 rounded-md border border-borda p-2"
              >
                <a
                  href={candidato.urlExemplo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-xs text-acento underline underline-offset-4"
                >
                  {candidato.urlExemplo}
                </a>
                <span className="text-xs text-texto-suave">
                  {t("fonte.confirmar")}
                </span>
                <button
                  type="button"
                  onClick={function () { void confirmar(candidato); }}
                  disabled={ocupado}
                  className="w-fit rounded-md bg-acento px-3 py-1 text-xs font-medium text-acento-contraste disabled:opacity-60"
                >
                  {t("fonte.usar")}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {paginaDaObra && (
        <div className="flex flex-col gap-1 rounded-md border border-dashed border-borda p-2">
          <span className="text-xs text-texto-suave">
            {candidatos && candidatos.length > 0
              ? t("fonte.paginaComCandidatos")
              : t("fonte.paginaSemCandidatos")}
          </span>
          <a
            href={paginaDaObra.urlExemplo}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-xs text-acento underline underline-offset-4"
          >
            {paginaDaObra.urlExemplo}
          </a>
          <span className="text-xs text-texto-suave">
            {t("fonte.paginaDica")}
          </span>
          <button
            type="button"
            onClick={function () { void confirmar(paginaDaObra); }}
            disabled={ocupado}
            className="w-fit rounded-md border border-acento px-3 py-1 text-xs font-medium text-acento transition-colors hover:bg-acento hover:text-acento-contraste disabled:opacity-60"
          >
            {t("fonte.salvarPagina")}
          </button>
        </div>
      )}
    </div>
  );
}
