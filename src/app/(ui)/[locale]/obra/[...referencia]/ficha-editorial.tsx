import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GENEROS } from "@/server/domain/catalogo-filtros";
import { TEMAS, type DetalhesDaObra } from "@/server/domain/detalhes-da-obra";
import { CartaoObra } from "../../componentes/cartao-obra";

export async function GenerosDaObra({ generos }: { generos: string[] })
{
  const t = await getTranslations("ficha");
  return generos.flatMap(g => {
    const genero = GENEROS.find(conhecido => conhecido === g);
    return genero ? [
      <Link key={genero} href={`/catalogo?genero=${encodeURIComponent(genero)}`}
        className="rounded-full border border-borda px-2 py-0.5 hover:border-acento hover:text-acento">
        {t(`generos.${genero}`)}
      </Link>,
    ] : [];
  });
}

export async function FichaEditorial({ detalhes }: { detalhes?: DetalhesDaObra | null })
{
  const t = await getTranslations("ficha");
  const formato = await getFormatter();
  if (!detalhes) return null;
  const temas = TEMAS.filter(tema => detalhes.categories.includes(tema));
  const data = (iso: string) => formato.dateTime(new Date(`${iso}T00:00:00Z`), { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const linhas = [
    ...(detalhes.status ? [{ nome: t("publicacao"), valor: t(`status.${detalhes.status}`) }] : []),
    ...(detalhes.volumes ? [{ nome: t("volumes"), valor: formato.number(detalhes.volumes) }] : []),
    ...(detalhes.startDate ? [{ nome: t("inicio"), valor: data(detalhes.startDate) }] : []),
    ...(detalhes.endDate ? [{ nome: t("fim"), valor: data(detalhes.endDate) }] : []),
  ];
  if (!linhas.length && !temas.length && !detalhes.aliases.length) return null;
  return (
    <section aria-label={t("titulo")} className="flex flex-col gap-5 rounded-xl border border-borda bg-superficie p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">{t("titulo")}</h2>
      {linhas.length > 0 && <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {linhas.map(linha => <div key={linha.nome}>
          <dt className="text-xs text-texto-suave">{linha.nome}</dt>
          <dd className="mt-1 text-sm font-medium">{linha.valor}</dd>
        </div>)}
      </dl>}
      {temas.length > 0 && <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-texto-suave">{t("temas")}</span>
        {temas.map(tema => <Link key={tema} href={`/catalogo?tema=${tema}`}
          className="rounded-full border border-borda px-3 py-1 text-xs hover:border-acento hover:text-acento">
          {t(`temasNomes.${tema}`)}
        </Link>)}
      </div>}
      {detalhes.aliases.length > 0 && <details className="text-sm">
        <summary className="cursor-pointer text-texto-suave hover:text-texto">{t("aliases")}</summary>
        <ul className="mt-2 flex flex-col gap-1 text-texto-suave">
          {detalhes.aliases.map(alias => <li key={alias}>{alias}</li>)}
        </ul>
      </details>}
    </section>
  );
}

export async function ObrasRelacionadas({ detalhes }: { detalhes?: DetalhesDaObra | null })
{
  const t = await getTranslations("ficha");
  const c = await getTranslations("comum");
  if (!detalhes?.related.length) return null;
  return <section className="flex flex-col gap-4">
    <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">{t("relacionadas")}</h2>
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      {detalhes.related.map(obra => <CartaoObra key={obra.chave} chave={obra.chave} titulo={obra.titulo} capa={obra.capa}>
        <p className="text-xs font-medium text-acento">{t(`relacoes.${obra.relacao}`)}</p>
        {obra.tipo === "NOVEL" && <span className="text-xs text-texto-suave">{c("formato.NOVEL")}</span>}
      </CartaoObra>)}
    </ul>
  </section>;
}
