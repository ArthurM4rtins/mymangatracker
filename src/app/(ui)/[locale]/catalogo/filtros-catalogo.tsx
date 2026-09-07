"use client";

/**
 * A barra de filtros do catálogo (issue #37). Cada mudança vai para a URL —
 * filtro compartilhável, recarregável, e quem valida é o domínio no servidor.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { DECADAS, GENEROS } from "@/server/domain/catalogo-filtros";

const TIPOS = [
  { valor: "manga", rotulo: "Mangá" },
  { valor: "manhwa", rotulo: "Manhwa" },
  { valor: "manhua", rotulo: "Manhua" },
  { valor: "novel", rotulo: "Novel" },
];

const ORDENS = [
  { valor: "popular", rotulo: "Populares" },
  { valor: "nota", rotulo: "Melhor nota" },
  { valor: "alta", rotulo: "Em alta" },
  { valor: "recente", rotulo: "Mais recentes" },
];

export function FiltrosCatalogo()
{
  const roteador = useRouter();
  const params = useSearchParams();

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
        rotulo="Tipo"
        valor={params.get("tipo") ?? ""}
        opcoes={TIPOS}
        aoMudar={function (valor) { mudar("tipo", valor); }}
      />
      <Seletor
        rotulo="Gênero"
        valor={params.get("genero") ?? ""}
        opcoes={GENEROS.map(function (g) { return { valor: g, rotulo: g }; })}
        aoMudar={function (valor) { mudar("genero", valor); }}
      />
      <Seletor
        rotulo="Década"
        valor={params.get("decada") ?? ""}
        opcoes={DECADAS.map(function (d)
        {
          return { valor: String(d), rotulo: `${d}s` };
        })}
        aoMudar={function (valor) { mudar("decada", valor); }}
      />
      <Seletor
        rotulo="Ordenar"
        valor={params.get("ordem") ?? "popular"}
        opcoes={ORDENS}
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
          limpar filtros
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
  return (
    <label className="flex items-center gap-1.5 text-xs text-texto-suave">
      {rotulo}
      <select
        value={valor}
        onChange={function (evento) { aoMudar(evento.target.value); }}
        className="rounded-md border border-borda bg-superficie px-2 py-1.5 text-sm text-texto outline-none focus:border-acento"
      >
        {!semVazio && <option value="">Todos</option>}
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
