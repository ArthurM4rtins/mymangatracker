"use client";

/**
 * Os filtros da grade de avaliadas do perfil. Cada mudança vai para a URL —
 * compartilhável, recarregável, e quem valida é o domínio no servidor.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const ORDENS = [
  { valor: "recentes", rotulo: "Mais recentes" },
  { valor: "antigas", rotulo: "Mais antigas" },
  { valor: "maior_nota", rotulo: "Maior nota" },
  { valor: "menor_nota", rotulo: "Menor nota" },
];

const NOTAS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map(function (nota)
{
  return { valor: String(nota), rotulo: String(nota).replace(".", ",") };
});

export function FiltrosAvaliadas()
{
  const roteador = useRouter();
  const caminho = usePathname();
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
    roteador.replace(consulta === "" ? caminho : `${caminho}?${consulta}`, { scroll: false });
  }

  const temFiltro = params.get("ordem") !== null || params.get("nota") !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Seletor
        rotulo="Ordenar"
        valor={params.get("ordem") ?? "recentes"}
        opcoes={ORDENS}
        semVazio
        aoMudar={function (valor) { mudar("ordem", valor === "recentes" ? "" : valor); }}
      />
      <Seletor
        rotulo="Nota"
        valor={params.get("nota") ?? ""}
        opcoes={NOTAS}
        aoMudar={function (valor) { mudar("nota", valor); }}
      />
      {temFiltro && (
        <button
          type="button"
          onClick={function () { roteador.replace(caminho, { scroll: false }); }}
          className="text-xs text-texto-suave underline underline-offset-4 hover:text-texto"
        >
          limpar
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
        {!semVazio && <option value="">Todas</option>}
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
