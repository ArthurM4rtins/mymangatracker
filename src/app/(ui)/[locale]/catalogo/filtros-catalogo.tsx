"use client";

/**
 * A barra de filtros do catálogo (issue #37). Cada mudança vai para a URL —
 * filtro compartilhável, recarregável, e quem valida é o domínio no servidor.
 */
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";

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
  const [avancadosAbertos, setAvancadosAbertos] = useState(false);
  const painelId = useId();
  const curtasId = useId();
  const leiturasCurtas = params.get("curtas") === "1";
  const temAvancadosAtivos = Boolean(params.get("publicacao") || params.get("tema") || params.get("decada") || params.get("curtas"));

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
    <div className="flex flex-col gap-3">
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
          rotulo={t("filtros.ordenar")}
          valor={params.get("ordem") ?? "popular"}
          opcoes={ORDENS.map(function (ordem)
          {
            return { valor: ordem, rotulo: t(`filtros.ordens.${ordem}`) };
          })}
          semVazio
          aoMudar={function (valor) { mudar("ordem", valor === "popular" ? "" : valor); }}
        />
        <button type="button" aria-expanded={avancadosAbertos} aria-controls={painelId}
          onClick={() => setAvancadosAbertos(abertos => !abertos)}
          className="flex items-center gap-2 rounded-md border border-borda px-3 py-1.5 text-xs text-texto-suave transition-colors hover:border-acento hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento">
          {t("filtros.avancados")}
          {temAvancadosAtivos && <span className="rounded-full bg-acento/10 px-1.5 py-0.5 text-acento">{t("filtros.avancadosAtivos")}</span>}
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            className={`transition-transform motion-reduce:transition-none ${avancadosAbertos ? "rotate-180" : ""}`}>
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
      <div id={painelId} hidden={!avancadosAbertos} className="rounded-lg border border-borda bg-superficie p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Seletor empilhado rotulo={f("publicacao")} valor={leiturasCurtas ? "finished" : params.get("publicacao") ?? ""}
            opcoes={(["current", "finished"] as const).map(status => ({ valor: status, rotulo: f(`status.${status}`) }))}
            aoMudar={valor => mudar("publicacao", valor)} />
          <Seletor empilhado rotulo={f("temas")} valor={params.get("tema") ?? ""}
            opcoes={TEMAS.map(tema => ({ valor: tema, rotulo: f(`temasNomes.${tema}`) }))}
            aoMudar={valor => mudar("tema", valor)} />
          <Seletor empilhado rotulo={t("filtros.decada")} valor={params.get("decada") ?? ""}
            opcoes={DECADAS.map(d => ({ valor: String(d), rotulo: f("decada", { n: String(d) }) }))}
            aoMudar={valor => mudar("decada", valor)} />
          <button type="button" role="switch" aria-checked={leiturasCurtas}
            aria-labelledby={curtasId} aria-describedby={`${curtasId}-descricao`}
            onClick={() => mudar("curtas", leiturasCurtas ? "" : "1")}
            className={`flex w-full items-center justify-between gap-4 rounded-lg border p-3 text-left transition-colors hover:border-acento focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento sm:col-span-3 ${leiturasCurtas ? "border-acento/50 bg-acento/5" : "border-borda bg-fundo/50"}`}>
            <span className="flex flex-col gap-1">
              <span id={curtasId} className="text-sm font-medium text-texto">{f("curtas")}</span>
              <span id={`${curtasId}-descricao`} className="text-xs text-texto-suave">{f("curtasDescricao")}</span>
            </span>
            <span aria-hidden="true" className={`flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${leiturasCurtas ? "bg-acento" : "bg-borda"}`}>
              <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${leiturasCurtas ? "translate-x-4" : ""}`} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Seletor({
  rotulo,
  valor,
  opcoes,
  semVazio = false,
  empilhado = false,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: ReadonlyArray<{ valor: string; rotulo: string }>;
  semVazio?: boolean;
  empilhado?: boolean;
  aoMudar: (valor: string) => void;
})
{
  const t = useTranslations("catalogo");

  return (
    <label className={`flex gap-1.5 text-xs text-texto-suave ${empilhado ? "min-w-0 flex-col" : "items-center"}`}>
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
