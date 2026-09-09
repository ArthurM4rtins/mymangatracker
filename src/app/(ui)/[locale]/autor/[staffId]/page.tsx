import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { alternativasDeIdioma } from "@/i18n/navigation";
import { idiomaDoSegmento } from "@/i18n/routing";
import { autorParaPaginaDoSistema } from "@/server/services/autor.service";
import { BioDoAutor } from "./bio-do-autor";
import { ColecaoVisual } from "../../componentes/colecao-visual";
import { CartaoObra } from "../../componentes/cartao-obra";

// AniList ao vivo: nada pré-renderizável.
export const dynamic = "force-dynamic";

// generateMetadata e a página no mesmo request: sem memoizar eram dois POSTs
// ao AniList por visita, sem cache nenhum no caminho do autor (#65, item 6).
const carregarAutor = cache(autorParaPaginaDoSistema);

type Props = {
  params: Promise<{ staffId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/autor/[staffId]">)
{
  const { locale, staffId } = await params;
  const t = await getTranslations({ locale: idiomaDoSegmento(locale), namespace: "autor" });
  const id = Number(staffId);

  if (!Number.isInteger(id) || id <= 0)
  {
    return { title: t("meta.titulo"), alternates: alternativasDeIdioma(`/autor/${staffId}`) };
  }

  const resultado = await carregarAutor(id);

  return {
    title: resultado.estado === "ok" ? resultado.autor.nome : t("meta.titulo"),
  };
}

export default async function PaginaDoAutor({ params }: Props)
{
  const id = Number((await params).staffId);

  if (!Number.isInteger(id) || id <= 0)
  {
    notFound();
  }

  const resultado = await carregarAutor(id);
  const t = await getTranslations("autor");

  if (resultado.estado === "nao_encontrado")
  {
    notFound();
  }

  if (resultado.estado === "indisponivel")
  {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          {t("erros.indisponivel")}
        </p>
      </main>
    );
  }

  const { autor } = resultado;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-6 py-12">
      <section className="flex flex-col gap-6 sm:flex-row">
        {autor.imagemUrl ? (
          <Image
            src={autor.imagemUrl}
            alt=""
            width={160}
            height={160}
            className="h-40 w-40 shrink-0 rounded-lg object-cover shadow-lg"
            unoptimized
            priority
          />
        ) : (
          <div
            aria-hidden
            className="flex h-40 w-40 shrink-0 items-center justify-center rounded-lg bg-superficie text-texto-suave"
          >
            —
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-marca text-3xl font-bold tracking-tight">
              {autor.nome}
            </h1>
            {autor.nomeNativo && (
              <span className="text-lg text-texto-suave">{autor.nomeNativo}</span>
            )}
          </div>

          {autor.descricao && <BioDoAutor texto={autor.descricao} />}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
          {t("obras.titulo")}
        </h2>

        {autor.obras.length === 0 ? (
          <p className="text-sm text-texto-suave">
            {t("obras.vazia")}
          </p>
        ) : (
          <ColecaoVisual titulo={t("obras.titulo")}
            classeGrade="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6"
            itens={autor.obras.map((obra) => ({
              id: obra.anilistId,
              titulo: obra.titleEnglish ?? obra.titleRomaji,
              capa: obra.coverImageUrl,
              detalhe: (
                <CartaoObra anilistId={obra.anilistId} titulo={obra.titleEnglish ?? obra.titleRomaji}
                  capa={obra.coverImageUrl}>
                  {obra.startYear !== null && (
                    <span className="text-xs tabular-nums text-texto-suave">{obra.startYear}</span>
                  )}
                </CartaoObra>
              ),
            }))}
          />
        )}
      </section>
    </main>
  );
}
