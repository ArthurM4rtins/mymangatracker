import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buscarNoCatalogo, obraParaDTO } from "@/server/services/catalogo.service";
import { chavesNaEstanteDoSistema } from "@/server/services/estante.service";
import { interpretarFiltros } from "@/server/domain/catalogo-filtros";
import { headers } from "next/headers";
import { alternativasDeIdioma } from "@/i18n/navigation";
import { escolherIp } from "@/server/domain/ip-do-visitante";
import { proxiesConfiaveis } from "@/server/services/limite.service";
import { usuarioDaSessao } from "../../../api/v1/_shared/sessao";
import { BuscaCatalogo } from "./busca-catalogo";
import { FiltrosCatalogo } from "./filtros-catalogo";
import { idiomaDoSegmento } from "@/i18n/routing";
import { ColecaoDoCatalogo } from "./colecao-do-catalogo";

// A busca depende do termo da URL e do AniList: nada aqui é pré-renderizável.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/catalogo">): Promise<Metadata>
{
  const { locale } = await params;
  const t = await getTranslations({ locale: idiomaDoSegmento(locale), namespace: "catalogo" });

  return { title: t("meta.titulo"), alternates: alternativasDeIdioma("/catalogo") };
}

// O mesmo parâmetro repetido na URL vira array (issue #145). O tipo tem que
// dizer a verdade sobre o que chega; quem escolhe o valor é `interpretarFiltros`.
type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Catalogo({ searchParams }: Props)
{
  const filtro = interpretarFiltros(await searchParams);
  // Os cabeçalhos são lidos aqui, na camada que pode (#134): serviço não toca
  // em `headers()`, e a regra de qual IP vale mora no domínio.
  const cabecalhos = await headers();
  const ip = escolherIp(function (nome) { return cabecalhos.get(nome); }, proxiesConfiaveis());
  const [resultado, naEstante] = await Promise.all([
    buscarNoCatalogo(filtro, undefined, ip),
    idsNaEstante(),
  ]);
  const t = await getTranslations("catalogo");
  const temObras =
    resultado.estado === "ok"
    || resultado.estado === "destaques"
    // #165 e #219: cache e Kitsu renderizam os mesmos cards; o que muda e' a
    // faixa de aviso que diz de onde vieram.
    || resultado.estado === "cache"
    || resultado.estado === "kitsu";

  // A primeira página vai pronta para o cliente, como DTO: é o mesmo formato
  // que a API devolve nas páginas seguintes, então o card é um só.
  const obras = temObras
    ? resultado.obras.map((obra) => obraParaDTO(obra, naEstante))
    : [];

  // Os filtros atuais, para o "ver mais" pedir a próxima página da MESMA busca.
  const consulta = new URLSearchParams();
  if (filtro.termo !== "") consulta.set("q", filtro.termo);
  if (filtro.tipo !== undefined) consulta.set("tipo", filtro.tipo);
  if (filtro.genero !== undefined) consulta.set("genero", filtro.genero);
  if (filtro.decada !== undefined) consulta.set("decada", String(filtro.decada));
  if (filtro.ordem !== "popular") consulta.set("ordem", filtro.ordem);
  if (filtro.publicacao) consulta.set("publicacao", filtro.publicacao);
  if (filtro.tema) consulta.set("tema", filtro.tema);
  if (filtro.curtas) consulta.set("curtas", "1");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">{t("titulo")}</h1>
        <p className="text-texto-suave">
          {t("subtitulo")}
        </p>
      </header>

      <BuscaCatalogo termoInicial={resultado.termo} />

      <FiltrosCatalogo />

      {resultado.estado === "indisponivel" && (
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          {t("erros.indisponivel")}
        </p>
      )}

      {resultado.estado === "muitos_pedidos" && (
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          {t("erros.muitosPedidos")}
        </p>
      )}

      {resultado.estado === "cache" && (
        <p className="text-xs text-texto-suave">{t("erros.doCache")}</p>
      )}

      {resultado.estado === "vazio" && (
        <p className="text-sm text-texto-suave">
          {resultado.termo === "" ? (
            t("vazio.semTermo")
          ) : (
            t.rich("vazio.semResultado", {
              termo: resultado.termo,
              forte: function (partes) { return <strong>{partes}</strong>; },
            })
          )}
        </p>
      )}

      {temObras && (
        <section className="flex flex-col gap-4">
          {resultado.estado === "destaques" && (
            <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
              {t("destaques")}
            </h2>
          )}
          <ColecaoDoCatalogo
            inicial={obras}
            temMaisInicial={"temMais" in resultado && resultado.temMais}
            consulta={consulta.toString()}
            tituloDoGrupo={resultado.estado === "destaques" ? t("destaques") : t("titulo")}
          />
        </section>
      )}
    </main>
  );
}

/** Banco fora ou sem sessão: nada marcado, o catálogo segue de pé. */
async function idsNaEstante(): Promise<Set<string>>
{
  try
  {
    const userId = await usuarioDaSessao();

    if (!userId)
    {
      return new Set();
    }

    return new Set(await chavesNaEstanteDoSistema(userId));
  }
  catch
  {
    return new Set();
  }
}
