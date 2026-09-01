"use client";

/**
 * Configura a fonte de leitura: o usuário cola o link do capítulo 1, o
 * servidor deriva os candidatos e cada um volta com o link de exemplo do
 * capítulo 2 — o usuário testa e confirma. Nada é escolhido em silêncio.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [aberto, setAberto] = useState(false);
  const [url, setUrl] = useState("");
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function derivar()
  {
    setOcupado(true);
    setErro(null);
    setCandidatos(null);

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
        setErro(corpo?.erros?.url ?? "não deu para derivar — confira o link");
        return;
      }

      if (corpo.candidatos.length === 0)
      {
        setErro("nenhum segmento com \"1\" no link — cole o link do capítulo 1");
        return;
      }

      setCandidatos(corpo.candidatos);
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
        setErro("não deu para salvar — tente de novo");
        return;
      }

      setAberto(false);
      setUrl("");
      setCandidatos(null);
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
      <button
        type="button"
        onClick={function () { setAberto(true); }}
        className="text-sm text-acento underline underline-offset-4"
      >
        {temFonte ? "Trocar fonte" : "Configurar leitura"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-borda bg-fundo p-3">
      <label className="flex flex-col gap-1 text-xs text-texto-suave">
        Cole o link do capítulo 1 no site onde você lê
        <input
          type="url"
          value={url}
          onChange={function (evento) { setUrl(evento.target.value); }}
          placeholder="https://site.com/obra/capitulo/1"
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
          {ocupado ? "Derivando…" : "Derivar"}
        </button>
        <button
          type="button"
          onClick={function () { setAberto(false); setErro(null); setCandidatos(null); }}
          className="text-sm text-texto-suave hover:text-texto"
        >
          Cancelar
        </button>
      </div>

      {erro && (
        <p role="alert" className="text-xs text-texto-suave">
          {erro}
        </p>
      )}

      {candidatos && (
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
                  Esse link abre o capítulo 2? Então:
                </span>
                <button
                  type="button"
                  onClick={function () { void confirmar(candidato); }}
                  disabled={ocupado}
                  className="w-fit rounded-md bg-acento px-3 py-1 text-xs font-medium text-acento-contraste disabled:opacity-60"
                >
                  Usar esta fonte
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
