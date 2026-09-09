import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { buscarNoCatalogo } from "@/server/services/catalogo.service";
import { anilistIdsNaEstanteDoSistema } from "@/server/services/estante.service";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { interpretarFiltros } from "@/server/domain/catalogo-filtros";
import { headers } from "next/headers";
import { alternativasDeIdioma, Link } from "@/i18n/navigation";
import { escolherIp } from "@/server/domain/ip-do-visitante";
import { proxiesConfiaveis } from "@/server/services/limite.service";
import { usuarioDaSessao } from "../../../api/v1/_shared/sessao";
import { BotaoEstante } from "./botao-estante";
import { BuscaCatalogo } from "./busca-catalogo";
import { FiltrosCatalogo } from "./filtros-catalogo";
import { idiomaDoSegmento } from "@/i18n/routing";

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

      {(resultado.estado === "ok" || resultado.estado === "destaques") && (
        <section className="flex flex-col gap-4">
          {resultado.estado === "destaques" && (
            <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
              {t("destaques")}
            </h2>
          )}
          <ul className="grid gap-5 sm:grid-cols-2">
            {resultado.obras.map(function (obra)
            {
              return (
                <Obra
                  key={obra.anilistId}
                  obra={obra}
                  jaNaEstante={naEstante.has(obra.anilistId)}
                />
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

/** Banco fora ou sem sessão: nada marcado, o catálogo segue de pé. */
async function idsNaEstante(): Promise<Set<number>>
{
  try
  {
    const userId = await usuarioDaSessao();

    if (!userId)
    {
      return new Set();
    }

    return new Set(await anilistIdsNaEstanteDoSistema(userId));
  }
  catch
  {
    return new Set();
  }
}

async function Obra({ obra, jaNaEstante }: { obra: MediaDoAniList; jaNaEstante: boolean })
{
  const t = await getTranslations("catalogo");
  const c = await getTranslations("comum");
  const rotulo = obra.countryOfOrigin
    ? c(`formato.${obra.countryOfOrigin}`)
    : t("cartao.formatoGenerico");

  return (
    <li className="group flex gap-4 rounded-lg border border-borda bg-superficie p-4 transition-colors hover:border-acento/60">
      <Link href={`/obra/${obra.anilistId}`} className="shrink-0">
        {obra.coverImageUrl ? (
          <Image
            src={obra.coverImageUrl}
            alt=""
            width={112}
            height={168}
            className="h-42 w-28 rounded-md object-cover shadow-sm transition-opacity hover:opacity-80"
            unoptimized
          />
        ) : (
          <div
            aria-hidden
            className="flex h-42 w-28 items-center justify-center rounded-md bg-fundo text-texto-suave"
          >
            —
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="line-clamp-2 font-medium leading-snug">
          <Link href={`/obra/${obra.anilistId}`} className="hover:text-acento">
            {obra.titleEnglish ?? obra.titleRomaji}
          </Link>
        </h2>

        <p className="flex flex-wrap items-center gap-1.5 text-xs text-texto-suave">
          <span className="rounded-full border border-borda px-2 py-0.5">
            {obra.type === "NOVEL" ? c("formato.NOVEL") : rotulo}
          </span>
          {obra.chapters !== undefined && (
            <span className="tabular-nums">
              {t("cartao.capitulos", { n: obra.chapters })}
            </span>
          )}
        </p>

        {obra.description && (
          <p className="line-clamp-3 text-sm text-texto-suave">{obra.description}</p>
        )}

        <div className="mt-auto pt-2">
          <BotaoEstante anilistId={obra.anilistId} jaNaEstante={jaNaEstante} />
        </div>
      </div>
    </li>
  );
}
