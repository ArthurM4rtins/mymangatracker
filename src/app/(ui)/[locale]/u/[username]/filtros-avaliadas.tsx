"use client";

/**
 * Os filtros da grade de avaliadas do perfil. Cada mudança vai para a URL —
 * compartilhável, recarregável, e quem valida é o domínio no servidor.
 */
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

// O valor vai para a URL e é a chave do rótulo: o texto vive no catálogo.
const ORDENS = ["recentes", "antigas", "maior_nota", "menor_nota"] as const;

const NOTAS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map(function (nota)
{
  return { valor: String(nota), rotulo: String(nota).replace(".", ",") };
});

export function FiltrosAvaliadas()
{
  const roteador = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const t = useTranslations("perfil");

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

  const ordens = ORDENS.map(function (ordem)
  {
    return { valor: ordem, rotulo: t(`filtros.ordens.${ordem}`) };
  });

  const temFiltro = params.get("ordem") !== null || params.get("nota") !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Seletor
        rotulo={t("filtros.ordenar")}
        valor={params.get("ordem") ?? "recentes"}
        opcoes={ordens}
        semVazio
        aoMudar={function (valor) { mudar("ordem", valor === "recentes" ? "" : valor); }}
      />
      <Seletor
        rotulo={t("filtros.nota")}
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
  const t = useTranslations("perfil");

  return (
    <label className="flex items-center gap-1.5 text-xs text-texto-suave">
      {rotulo}
      <select
        value={valor}
        onChange={function (evento) { aoMudar(evento.target.value); }}
        className="rounded-md border border-borda bg-superficie px-2 py-1.5 text-sm text-texto outline-none focus:border-acento"
      >
        {!semVazio && <option value="">{t("filtros.todas")}</option>}
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
