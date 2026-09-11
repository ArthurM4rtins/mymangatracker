"use client";

/**
 * Formulário de login. `POST /api/v1/sessao` grava o cookie httpOnly — o JS da
 * página nunca vê o token. Credencial inválida é UMA mensagem só, igual para
 * e-mail inexistente e senha errada.
 *
 * A API responde código de erro, não frase — quem escolhe o texto é a tela.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ERRO, type CodigoDeErro } from "@/app/api/v1/_shared/erros";
import { useRouter } from "@/i18n/navigation";

const CODIGOS: ReadonlySet<string> = new Set(Object.values(ERRO));

function ehCodigo(valor: unknown): valor is CodigoDeErro
{
  return typeof valor === "string" && CODIGOS.has(valor);
}

export function FormularioDeLogin()
{
  const roteador = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const t = useTranslations("entrar");
  const vocabulario = useTranslations("erros");

  /**
   * Código vira frase. `falha_interna` é genérico demais no vocabulário ("não
   * foi possível agora") e aqui a frase é a do login. Código que esta tela não
   * conhece — API mais nova, resposta estranha — cai na frase genérica: código
   * cru nunca chega ao usuário.
   */
  function frase(codigo: string | undefined): string
  {
    if (!ehCodigo(codigo))
    {
      return t("erros.geral");
    }

    if (codigo === ERRO.FALHA_INTERNA)
    {
      return t("erros.falhaInterna");
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
      const resposta = await fetch("/api/v1/sessao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identificador: formulario.get("identificador"),
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
      setErro(frase(corpo.erros?._geral));
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
        <span className="font-medium">{t("campos.identificador")}</span>
        {/* Aceita e-mail ou nome de usuario (#166): `type="text"`, porque
            `type="email"` faria o navegador recusar "roca" antes de enviar. */}
        <input
          name="identificador"
          type="text"
          autoComplete="username"
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
