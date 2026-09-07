"use client";

/**
 * Formulário de login. `POST /api/v1/sessao` grava o cookie httpOnly — o JS da
 * página nunca vê o token. Credencial inválida é UMA mensagem só, igual para
 * e-mail inexistente e senha errada.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";

export function FormularioDeLogin()
{
  const roteador = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const t = useTranslations("entrar");

  async function enviar(evento: React.FormEvent<HTMLFormElement>)
  {
    evento.preventDefault();

    const formulario = new FormData(evento.currentTarget);
    setEnviando(true);
    setErro(null);

    try
    {
      const resposta = await fetch("/api/v1/sessao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formulario.get("email"),
          senha: formulario.get("senha"),
        }),
      });

      if (resposta.ok)
      {
        roteador.push("/");
        roteador.refresh();
        return;
      }

      const corpo = (await resposta.json()) as { erros?: { _geral?: string } };
      setErro(corpo.erros?._geral ?? t("erros.geral"));
    }
    catch
    {
      setErro(t("erros.conexao"));
    }
    finally
    {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t("campos.email")}</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-borda bg-superficie px-3 py-2 outline-none focus:border-acento"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t("campos.senha")}</span>
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-borda bg-superficie px-3 py-2 outline-none focus:border-acento"
        />
      </label>

      {erro && (
        <p role="alert" className="text-sm text-acento">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-acento px-4 py-2 text-sm font-medium text-acento-contraste transition-opacity disabled:opacity-60"
      >
        {enviando ? t("acoes.enviando") : t("acoes.enviar")}
      </button>
    </form>
  );
}
