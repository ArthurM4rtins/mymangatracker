import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  interpretarOrdemDasListas,
  ORDENS_DAS_LISTAS,
} from "@/server/domain/lista-listagem";
import { listasPublicasDoSistema } from "@/server/services/lista.service";
import { Link, alternativasDeIdioma } from "@/i18n/navigation";
import { usuarioDaSessao } from "../../../api/v1/_shared/sessao";
import { CardLista } from "../vitrine-cards";
import { CriarLista } from "./criar-lista";
import { idiomaDoSegmento } from "@/i18n/routing";

// Listas vêm do banco e mudam a toda hora: nada pré-renderizável.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/listas">): Promise<Metadata>
{
  const { locale } = await params;
  const t = await getTranslations({ locale: idiomaDoSegmento(locale), namespace: "listas" });

  return {
    title: t("indice.meta.titulo"),
    alternates: alternativasDeIdioma("/listas"),
  };
}

type Props = {
  searchParams: Promise<{ ordem?: string | string[] }>;
};

export default async function Listas({ searchParams }: Props)
{
  const ordem = interpretarOrdemDasListas((await searchParams).ordem);
  const userId = await usuarioDaSessao();
  const t = await getTranslations("listas");

  let listas;
  try
  {
    listas = await listasPublicasDoSistema(ordem);
  }
  catch
  {
    listas = null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">{t("indice.titulo")}</h1>
        <p className="text-texto-suave">
          {t("indice.subtitulo")}
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        {userId ? (
          <CriarLista />
        ) : (
          <p className="text-sm text-texto-suave">
            {t.rich("indice.convite", {
              entrar: function (conteudo)
              {
                return (
                  <Link href="/entrar" className="text-acento underline underline-offset-4">
                    {conteudo}
                  </Link>
                );
              },
            })}
          </p>
        )}

        <nav aria-label={t("indice.ordenar.rotulo")} className="flex rounded-md border border-borda p-0.5 text-xs">
          {ORDENS_DAS_LISTAS.map(function (opcao)
          {
            const ativa = opcao === ordem;

            return (
              <Link
                key={opcao}
                href={opcao === "recentes" ? "/listas" : `/listas?ordem=${opcao}`}
                aria-current={ativa ? "page" : undefined}
                className={`rounded px-2.5 py-1 transition-colors ${
                  ativa ? "bg-superficie text-texto" : "text-texto-suave hover:text-texto"
                }`}
              >
                {t(`indice.ordenar.${opcao}`)}
              </Link>
            );
          })}
        </nav>
      </div>

      {listas === null && (
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          {t("erros.semBanco")}
        </p>
      )}

      {listas !== null && listas.length === 0 && (
        <p className="text-sm text-texto-suave">
          {t("indice.vazia")}
        </p>
      )}

      {listas !== null && listas.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listas.map(function (lista)
          {
            return (
              <li key={lista.listaId}>
                <CardLista
                  listaId={lista.listaId}
                  username={lista.username}
                  nome={lista.nome}
                  totalDeObras={lista.totalDeObras}
                  capas={lista.capas}
                  curtidas={lista.curtidas}
                  descricao={lista.descricao}
                  fluido
                />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
