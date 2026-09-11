"use client";

/**
 * Editar nome e descrição da própria lista (issue #51): o cabeçalho vira um
 * formulário inline, salva com PATCH e recarrega.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ERRO, type CodigoDeErro } from "@/app/api/v1/_shared/erros";
import { useRouter } from "@/i18n/navigation";

/**
 * A API responde código, não frase — a tela escolhe a frase. Código que esta
 * versão da tela não conhece cai na frase genérica, nunca aparece cru.
 */
const CODIGOS: ReadonlySet<string> = new Set(Object.values(ERRO));

function ehCodigo(valor: unknown): valor is CodigoDeErro
{
  return typeof valor === "string" && CODIGOS.has(valor);
}

export function EditarLista({
  listaId,
  nome,
  descricao,
}: {
  listaId: string;
  nome: string;
  descricao: string | null;
})
{
  const roteador = useRouter();
  const t = useTranslations("listas");
  const c = useTranslations("comum");
  const erros = useTranslations("erros");
  const [editando, setEditando] = useState(false);
  const [novoNome, setNovoNome] = useState(nome);
  const [novaDescricao, setNovaDescricao] = useState(descricao ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  /**
   * Dois códigos ganham a frase desta tela, porque o catálogo é mais genérico
   * que o que se lê aqui: a sessão é para usar listas, e o nome inválido fica
   * colado no campo, sem repetir a palavra "nome".
   */
  function fraseDoErro(codigo: unknown): string
  {
    if (codigo === ERRO.SESSAO_NECESSARIA)
    {
      return t("detalhe.editar.sessao");
    }

    if (codigo === ERRO.NOME_INVALIDO)
    {
      return t("detalhe.editar.nomeInvalido");
    }

    return ehCodigo(codigo) ? erros(codigo) : t("detalhe.editar.erro");
  }

  async function salvar(evento: React.FormEvent)
  {
    evento.preventDefault();
    setOcupado(true);
    setErro(null);

    try
    {
      const resposta = await fetch(`/api/v1/listas/${listaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome, descricao: novaDescricao }),
      });

      if (!resposta.ok)
      {
        const corpo = (await resposta.json().catch(function () { return null; })) as
          | { erros?: Record<string, string> }
          | null;
        setErro(fraseDoErro(corpo?.erros?.nome ?? corpo?.erros?._geral));
        return;
      }

      setEditando(false);
      roteador.refresh();
    }
    finally
    {
      setOcupado(false);
    }
  }

  if (!editando)
  {
    return (
      <button
        type="button"
        onClick={function () { setEditando(true); }}
        className="text-sm text-texto-suave underline underline-offset-4 hover:text-texto"
      >
        {t("detalhe.editar.abrir")}
      </button>
    );
  }

  return (
    <form onSubmit={salvar} className="flex w-full max-w-xl flex-col gap-2">
      <input
        value={novoNome}
        onChange={function (e) { setNovoNome(e.target.value); }}
        maxLength={100}
        required
        aria-label={t("campos.nome")}
        className="rounded-md border border-borda bg-superficie px-3 py-2 font-marca text-xl font-bold text-texto outline-none focus:border-acento"
      />
      <textarea
        value={novaDescricao}
        onChange={function (e) { setNovaDescricao(e.target.value); }}
        maxLength={2000}
        rows={2}
        placeholder={t("campos.descricaoOpcional")}
        aria-label={t("campos.descricao")}
        className="rounded-md border border-borda bg-superficie px-3 py-2 text-sm text-texto outline-none focus:border-acento"
      />
      {erro && <p className="text-xs text-acento">{erro}</p>}
      <div className="flex items-center gap-3 text-sm">
        <button
          type="submit"
          disabled={ocupado}
          className="rounded-md bg-acento px-3 py-1.5 text-acento-contraste disabled:opacity-60"
        >
          {c("salvar")}
        </button>
        <button
          type="button"
          onClick={function ()
          {
            setEditando(false);
            setNovoNome(nome);
            setNovaDescricao(descricao ?? "");
            setErro(null);
          }}
          className="text-texto-suave hover:text-texto"
        >
          {c("cancelar")}
        </button>
      </div>
    </form>
  );
}
