"use client";

/**
 * A barra de filtros do catálogo (issue #37). Cada mudança vai para a URL —
 * filtro compartilhável, recarregável, e quem valida é o domínio no servidor.
 */
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { DECADAS, GENEROS } from "@/server/domain/catalogo-filtros";
import { TEMAS } from "@/server/domain/detalhes-da-obra";
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
  const f = useTranslations("ficha");

  function mudar(chave: string, valor: string)
  {
    const novos = new URLSearchParams(params.toString());
    novos.delete("pagina");
    if (chave === "publicacao" && valor !== "finished") novos.delete("curtas");
    if (chave === "curtas" && valor === "1") novos.set("publicacao", "finished");

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
        opcoes={GENEROS.map(function (g) { return { valor: g, rotulo: f(`generos.${g}`) }; })}
        aoMudar={function (valor) { mudar("genero", valor); }}
      />
      <Seletor
        rotulo={t("filtros.decada")}
        valor={params.get("decada") ?? ""}
        opcoes={DECADAS.map(function (d)
        {
          return { valor: String(d), rotulo: f("decada", { n: String(d) }) };
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
      <Seletor rotulo={f("publicacao")} valor={params.get("curtas") === "1" ? "finished" : params.get("publicacao") ?? ""}
        opcoes={(["current", "finished"] as const).map(status => ({ valor: status, rotulo: f(`status.${status}`) }))}
        aoMudar={valor => mudar("publicacao", valor)} />
      <Seletor rotulo={f("temas")} valor={params.get("tema") ?? ""}
        opcoes={TEMAS.map(tema => ({ valor: tema, rotulo: f(`temasNomes.${tema}`) }))}
        aoMudar={valor => mudar("tema", valor)} />
      <label className="flex items-center gap-2 rounded-md border border-borda px-2 py-1.5 text-xs text-texto-suave">
        <input type="checkbox" checked={params.get("curtas") === "1"} onChange={evento => mudar("curtas", evento.target.checked ? "1" : "")} />
        <span>{f("curtas")} <span className="block text-xs">{f("curtasDescricao")}</span></span>
      </label>
      {(params.get("tipo") || params.get("genero") || params.get("decada") || params.get("ordem") || params.get("publicacao") || params.get("tema") || params.get("curtas")) && (
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
