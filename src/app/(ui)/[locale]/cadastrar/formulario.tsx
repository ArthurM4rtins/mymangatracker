"use client";

/**
 * Formulário de cadastro. Fala com `POST /api/v1/usuarios` — a única porta de
 * escrita é a API versionada. Erro por campo vem no corpo (`erros`), status 400
 * (validação) ou 409 (duplicidade), e aparece embaixo do campo correspondente.
 *
 * O corpo traz código de erro, não frase — no `_geral` e em cada campo, como o
 * `ja_em_uso` da duplicidade. Quem escolhe o texto é a tela.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ERRO, type CodigoDeErro } from "@/app/api/v1/_shared/erros";
import { useRouter } from "@/i18n/navigation";

type Erros = Record<string, string>;

const CODIGOS: ReadonlySet<string> = new Set(Object.values(ERRO));

function ehCodigo(valor: unknown): valor is CodigoDeErro
{
  return typeof valor === "string" && CODIGOS.has(valor);
}

export function FormularioDeCadastro()
{
  const roteador = useRouter();
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const t = useTranslations("cadastrar");
  const vocabulario = useTranslations("erros");

  /**
   * Código vira frase. `falha_interna` é genérico demais no vocabulário ("não
   * foi possível agora") e aqui a frase é a do cadastro. Código que esta tela
   * não conhece — API mais nova, resposta estranha — cai na frase genérica:
   * código cru nunca chega ao usuário.
   */
  function frase(codigo: string): string
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

  /** Cada campo do corpo carrega um código, e todos passam pela mesma tradução. */
  function traduzir(recebidos: Erros | undefined): Erros
  {
    if (!recebidos)
    {
      return { _geral: t("erros.geral") };
    }

    return Object.fromEntries(
      Object.entries(recebidos).map(([campo, codigo]) => [campo, frase(codigo)]),
    );
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>)
  {
    evento.preventDefault();

    const formulario = new FormData(evento.currentTarget);
    setEnviando(true);
    setErros({});

    try
    {
      const resposta = await fetch("/api/v1/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formulario.get("username"),
          email: formulario.get("email"),
          senha: formulario.get("senha"),
        }),
      });

      if (resposta.ok)
      {
        roteador.push("/entrar?conta=criada");
        return;
      }

      const corpo = (await resposta.json()) as { erros?: Erros };
      setErros(traduzir(corpo.erros));
    }
    catch
    {
      setErros({ _geral: t("erros.conexao") });
    }
    finally
    {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      <Campo
        rotulo={t("campos.username")}
        nome="username"
        tipo="text"
        autoComplete="username"
        erro={erros.username}
      />
      <Campo
        rotulo={t("campos.email")}
        nome="email"
        tipo="email"
        autoComplete="email"
        erro={erros.email}
      />
      <Campo
        rotulo={t("campos.senha")}
        nome="senha"
        tipo="password"
        autoComplete="new-password"
        erro={erros.senha}
      />

      {erros._geral && (
        <p role="alert" className="text-sm text-acento">
          {erros._geral}
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

type PropsDoCampo = {
  rotulo: string;
  nome: string;
  tipo: string;
  autoComplete: string;
  erro?: string;
};

function Campo({ rotulo, nome, tipo, autoComplete, erro }: PropsDoCampo)
{
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{rotulo}</span>
      <input
        name={nome}
        type={tipo}
        autoComplete={autoComplete}
        required
        aria-invalid={erro ? true : undefined}
        className="rounded-md border border-borda bg-superficie px-3 py-2 outline-none focus:border-acento"
      />
      {erro && (
        <span role="alert" className="text-acento">
          {erro}
        </span>
      )}
    </label>
  );
}
