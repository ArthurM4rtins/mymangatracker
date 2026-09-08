import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import {
  listarEstanteDoSistema,
  type EntradaDaEstante,
  type StatusDaEstante,
} from "@/server/services/estante.service";
import { alternativasDeIdioma, Link, redirect } from "@/i18n/navigation";
import { idiomaDoSegmento } from "@/i18n/routing";
import { usuarioDaSessao } from "../../../api/v1/_shared/sessao";
import { Avaliar } from "./avaliar";
import { ContinuarLeitura } from "./continuar-leitura";
import { ResetarLeitura } from "./resetar-leitura";
import { EditarProgresso } from "./editar-progresso";
import { SeletorStatus } from "./seletor-status";
import { ColecaoVisual } from "../componentes/colecao-visual";

// Estante é da sessão e do banco: nada aqui é pré-renderizável.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/estante">): Promise<Metadata>
{
  const { locale } = await params;
  const t = await getTranslations({ locale: idiomaDoSegmento(locale), namespace: "estante" });

  return { title: t("meta.titulo"), alternates: alternativasDeIdioma("/estante") };
}

/** Os países que têm rótulo de formato; qualquer outro fica sem selo. */
const PAISES = ["JP", "KR", "CN"] as const;

/** A aba sem valor é a "Tudo": não filtra nada. */
const ABAS: (StatusDaEstante | undefined)[] = [
  undefined,
  "READING",
  "COMPLETED",
  "PLANNED",
  "PAUSED",
  "DROPPED",
];

const STATUS_VALIDOS = new Set(ABAS);

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function Estante({ searchParams }: Props)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return redirect({ href: "/entrar", locale: await getLocale() });
  }

  const { status } = await searchParams;
  const filtro = STATUS_VALIDOS.has(status as StatusDaEstante)
    ? (status as StatusDaEstante)
    : undefined;

  let entradas: EntradaDaEstante[] | null;
  try
  {
    entradas = await listarEstanteDoSistema({ userId, status: filtro });
  }
  catch
  {
    // Banco fora ou não configurado: a página degrada com aviso, não estoura.
    entradas = null;
  }

  const t = await getTranslations("estante");
  const c = await getTranslations("comum");
  const itens = (entradas ?? []).map((entrada) => ({
    id: entrada.obra.anilistId,
    titulo: entrada.obra.titleEnglish ?? entrada.obra.titleRomaji,
    capa: entrada.obra.coverImageUrl,
    detalhe: <Entrada entrada={entrada} />,
    status: entrada.status,
  }));
  const grupos = ABAS.filter((aba) => aba !== undefined).map((status) => ({
    id: status,
    titulo: c(`status.${status}`),
    itens: itens.filter((item) => item.status === status),
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">{t("titulo")}</h1>
        <p className="text-texto-suave">
          {t("descricao")}
        </p>
      </header>

      <nav aria-label={t("filtros.rotulo")} className="flex flex-wrap gap-2">
        {ABAS.map(function (aba)
        {
          const ativa = aba === filtro;

          return (
            <Link
              key={aba ?? "tudo"}
              href={aba ? `/estante?status=${aba}` : "/estante"}
              aria-current={ativa ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                ativa
                  ? "border-acento bg-acento text-acento-contraste"
                  : "border-borda text-texto-suave hover:text-texto"
              }`}
            >
              {aba === undefined ? t("filtros.tudo") : c(`status.${aba}`)}
            </Link>
          );
        })}
      </nav>

      {entradas === null && (
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          {t("erros.banco")}
        </p>
      )}

      {entradas !== null && entradas.length === 0 && (
        <p className="text-sm text-texto-suave">
          {t.rich("vazia", {
            catalogo: function (partes)
            {
              return (
                <Link href="/catalogo" className="text-acento underline underline-offset-4">
                  {partes}
                </Link>
              );
            },
          })}
        </p>
      )}

      {entradas !== null && entradas.length > 0 && (
        <ColecaoVisual itens={itens} grupos={grupos} titulo={t("titulo")} />
      )}
    </main>
  );
}

async function Entrada({ entrada }: { entrada: EntradaDaEstante })
{
  const t = await getTranslations("estante");
  const c = await getTranslations("comum");
  const { obra } = entrada;
  const pais = PAISES.find(function (valor) { return valor === obra.countryOfOrigin; });
  // País fora do mapa segue sem selo; obra que não declara país cai no genérico.
  const rotulo = pais === undefined
    ? (obra.countryOfOrigin === null ? t("obra") : "")
    : c(`formato.${pais}`);

  return (
    <li className="flex gap-4 rounded-lg border border-borda bg-superficie p-4">
      <Link href={`/obra/${obra.anilistId}`} className="shrink-0">
        {obra.coverImageUrl ? (
          <Image
            src={obra.coverImageUrl}
            alt=""
            width={96}
            height={144}
            className="h-36 w-24 rounded object-cover transition-opacity hover:opacity-80"
            unoptimized
          />
        ) : (
          <div
            aria-hidden
            className="flex h-36 w-24 items-center justify-center rounded bg-fundo text-texto-suave"
          >
            —
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="font-medium leading-snug">
          <Link href={`/obra/${obra.anilistId}`} className="hover:text-acento">
            {obra.titleEnglish ?? obra.titleRomaji}
          </Link>
        </h2>

        <p className="flex flex-wrap items-center gap-1.5 text-xs text-texto-suave">
          <span className="rounded-full border border-borda px-2 py-0.5">
            {obra.type === "NOVEL" ? c("formato.NOVEL") : rotulo}
          </span>
          {obra.chapters !== null && (
            <span className="tabular-nums">{t("capitulos", { capitulo: String(obra.chapters) })}</span>
          )}
          <EditarProgresso
            entradaId={entrada.entradaId}
            progressChapter={entrada.progressChapter}
          />
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <ContinuarLeitura continuarEm={entrada.continuarEm} />

          <div className="flex flex-wrap items-center gap-3">
            <SeletorStatus entradaId={entrada.entradaId} status={entrada.status} />
            {/* O desfazer da extensao (#172): so quando ha o que zerar. */}
            {(entrada.totalDeAberturas > 0 || entrada.progressChapter !== null) && (
              <ResetarLeitura
                entradaId={entrada.entradaId}
                titulo={entrada.obra.titleRomaji}
                totalDeAberturas={entrada.totalDeAberturas}
                progressChapter={entrada.progressChapter}
              />
            )}
          </div>

          <Avaliar anilistId={entrada.obra.anilistId} avaliacao={entrada.avaliacao} />
        </div>
      </div>
    </li>
  );
}
