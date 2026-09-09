"use client";

/**
 * Apagar a conta (issue #208).
 *
 * A confirmação é digitar o próprio nome de usuário. Não é para provar
 * identidade — quem está logado já provou —, é para a pessoa PARAR e ler o que
 * vai sumir. Por isso o aviso do que some vem antes do campo, e o botão só
 * habilita quando o nome bate.
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

export function ApagarConta({ username }: { username: string })
{
  const roteador = useRouter();
  const [digitado, setDigitado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [apagando, setApagando] = useState(false);
  const t = useTranslations("conta");
  const vocabulario = useTranslations("erros");

  const confere = digitado.trim().toLowerCase() === username.trim().toLowerCase();

  function frase(codigo: string | undefined): string
  {
    if (!ehCodigo(codigo) || codigo === ERRO.FALHA_INTERNA)
    {
      return t("erros.geral");
    }

    return vocabulario(codigo);
  }

  async function apagar(evento: React.FormEvent<HTMLFormElement>)
  {
    evento.preventDefault();
    setApagando(true);
    setErro(null);

    try
    {
      const resposta = await fetch("/api/v1/perfil", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacao: digitado }),
      });

      if (resposta.ok)
      {
        // A sessão acabou de morrer. `refresh` é o que importa: sem ele o cache
        // de rota do Next serviria telas renderizadas para a conta que não
        // existe mais.
        roteador.replace("/");
        roteador.refresh();
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
      setApagando(false);
    }
  }

  return (
    <form onSubmit={apagar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        {t("apagar.rotulo", { username })}
        <input
          type="text"
          value={digitado}
          onChange={function (evento) { setDigitado(evento.target.value); }}
          autoComplete="off"
          className="rounded-md border border-borda bg-superficie p-2"
        />
      </label>

      {erro !== null && (
        <p role="alert" className="text-sm text-nota">{erro}</p>
      )}

      <button
        type="submit"
        disabled={!confere || apagando}
        className="self-start rounded-md border border-nota px-4 py-2 text-sm font-medium text-nota disabled:opacity-50"
      >
        {apagando ? t("apagar.apagando") : t("apagar.botao")}
      </button>
    </form>
  );
}
