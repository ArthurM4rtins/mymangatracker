"use client";

/**
 * A barra de filtros do catálogo (issue #37). Cada mudança vai para a URL —
 * filtro compartilhável, recarregável, e quem valida é o domínio no servidor.
 */
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { DECADAS, GENEROS } from "@/server/domain/catalogo-filtros";
import { useRouter } from "@/i18n/navigation";

// `valor` vai cru para a URL; o rótulo sai de `comum.formato`, que já tem esses nomes.
const TIPOS = [
  { valor: "manga", formato: "JP" },
  { valor: "manhwa", formato: "KR" },
  { valor: "manhua", formato: "CN" },
  { valor: "novel", formato: "NOVEL" },
] as const;

const ORDENS = ["popular", "nota", "alta", "recente"] as const;

export function FiltrosCatalogo()
{
  const roteador = useRouter();
  const params = useSearchParams();
  const t = useTranslations("catalogo");
  const c = useTranslations("comum");

  function mudar(chave: string, valor: string)
  {
    const novos = new URLSearchParams(params.toString());

    if (valor === "")
    {
      novos.delete(chave);
    }
    else
    {
      novos.set(chave, valor);
    }

    const consulta = novos.toString();
    roteador.replace(consulta === "" ? "/catalogo" : `/catalogo?${consulta}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Seletor
        rotulo={t("filtros.tipo")}
        valor={params.get("tipo") ?? ""}
        opcoes={TIPOS.map(function (tipo)
        {
          return { valor: tipo.valor, rotulo: c(`formato.${tipo.formato}`) };
        })}
        aoMudar={function (valor) { mudar("tipo", valor); }}
      />
      <Seletor
        rotulo={t("filtros.genero")}
        valor={params.get("genero") ?? ""}
        opcoes={GENEROS.map(function (g) { return { valor: g, rotulo: g }; })}
        aoMudar={function (valor) { mudar("genero", valor); }}
      />
      <Seletor
        rotulo={t("filtros.decada")}
        valor={params.get("decada") ?? ""}
        opcoes={DECADAS.map(function (d)
        {
          return { valor: String(d), rotulo: `${d}s` };
        })}
        aoMudar={function (valor) { mudar("decada", valor); }}
      />
      <Seletor
        rotulo={t("filtros.ordenar")}
        valor={params.get("ordem") ?? "popular"}
        opcoes={ORDENS.map(function (ordem)
        {
          return { valor: ordem, rotulo: t(`filtros.ordens.${ordem}`) };
        })}
        semVazio
        aoMudar={function (valor) { mudar("ordem", valor === "popular" ? "" : valor); }}
      />
      {(params.get("tipo") || params.get("genero") || params.get("decada") || params.get("ordem")) && (
        <button
          type="button"
          onClick={function ()
          {
            const q = params.get("q");
            roteador.replace(q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo");
          }}
          className="text-xs text-texto-suave underline underline-offset-4 hover:text-texto"
        >
          {t("filtros.limpar")}
        </button>
      )}
    </div>
  );
}

function Seletor({
  rotulo,
  valor,
  opcoes,
  semVazio = false,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: ReadonlyArray<{ valor: string; rotulo: string }>;
  semVazio?: boolean;
  aoMudar: (valor: string) => void;
})
{
  const t = useTranslations("catalogo");

  return (
    <label className="flex items-center gap-1.5 text-xs text-texto-suave">
      {rotulo}
      <select
        value={valor}
        onChange={function (evento) { aoMudar(evento.target.value); }}
        className="rounded-md border border-borda bg-superficie px-2 py-1.5 text-sm text-texto outline-none focus:border-acento"
      >
        {!semVazio && <option value="">{t("filtros.todos")}</option>}
        {opcoes.map(function (opcao)
        {
          return (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          );
        })}
      </select>
    </label>
  );
}
