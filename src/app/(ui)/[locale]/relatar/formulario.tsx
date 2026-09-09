"use client";

/**
 * Formulário do relato de erro de tradução (issue #158).
 *
 * O envio vira issue pública no repositório, então o aviso disso está na tela
 * antes de a pessoa escrever — não depois.
 *
 * A API responde código de erro, não frase: quem escolhe o texto é a tela.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ERRO, type CodigoDeErro } from "@/app/api/v1/_shared/erros";

const CODIGOS: ReadonlySet<string> = new Set(Object.values(ERRO));

function ehCodigo(valor: unknown): valor is CodigoDeErro
{
  return typeof valor === "string" && CODIGOS.has(valor);
}

export function FormularioDeRelato({ rota, idioma }: { rota: string; idioma: string })
{
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const t = useTranslations("relatar");
  const vocabulario = useTranslations("erros");

  function frase(codigo: string | undefined): string
  {
    if (!ehCodigo(codigo))
    {
      return t("erros.geral");
    }

    if (codigo === ERRO.FALHA_INTERNA)
    {
      return t("erros.geral");
    }

    return vocabulario(codigo);
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>)
  {
    evento.preventDefault();

    const formulario = new FormData(evento.currentTarget);
    setEnviando(true);
    setErro(null);

    try
    {
      const resposta = await fetch("/api/v1/relatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: String(formulario.get("texto") ?? ""),
          sugestao: String(formulario.get("sugestao") ?? ""),
          rota,
          idioma,
        }),
      });

      if (resposta.ok)
      {
        setEnviado(true);
        return;
      }

      const corpo: unknown = await resposta.json().catch(function () { return null; });
      const codigo = typeof corpo === "object" && corpo !== null && "erros" in corpo
        ? (corpo as { erros?: { _geral?: unknown } }).erros?._geral
        : undefined;

      setErro(frase(typeof codigo === "string" ? codigo : undefined));
    }
    catch
    {
      setErro(t("erros.geral"));
    }
    finally
    {
      setEnviando(false);
    }
  }

  if (enviado)
  {
    return (
      <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
        {t("obrigado")}
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        {t("campos.texto")}
        <textarea
          name="texto"
          required
          rows={4}
          maxLength={2000}
          className="rounded-md border border-borda bg-superficie p-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("campos.sugestao")}
        <textarea
          name="sugestao"
          rows={3}
          maxLength={2000}
          className="rounded-md border border-borda bg-superficie p-2"
        />
      </label>

      {erro !== null && (
        <p role="alert" className="text-sm text-nota">{erro}</p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="self-start rounded-md bg-acento px-4 py-2 text-sm font-medium text-fundo disabled:opacity-60"
      >
        {enviando ? t("enviando") : t("enviar")}
      </button>
    </form>
  );
}
