"use client";

/**
 * Formulário de cadastro. Fala com `POST /api/v1/usuarios` — a única porta de
 * escrita é a API versionada. Erro por campo vem no corpo (`erros`), status 400
 * (validação) ou 409 (duplicidade), e aparece embaixo do campo correspondente.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

type Erros = Record<string, string>;

export function FormularioDeCadastro()
{
  const roteador = useRouter();
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

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
      setErros(corpo.erros ?? { _geral: "não foi possível concluir o cadastro" });
    }
    catch
    {
      setErros({ _geral: "sem conexão com o servidor — tente de novo" });
    }
    finally
    {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      <Campo
        rotulo="Nome de usuário"
        nome="username"
        tipo="text"
        autoComplete="username"
        erro={erros.username}
      />
      <Campo
        rotulo="E-mail"
        nome="email"
        tipo="email"
        autoComplete="email"
        erro={erros.email}
      />
      <Campo
        rotulo="Senha"
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
        {enviando ? "Criando…" : "Criar conta"}
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
