import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { autorParaPaginaDoSistema } from "@/server/services/autor.service";
import { BioDoAutor } from "./bio-do-autor";

// AniList ao vivo: nada pré-renderizável.
export const dynamic = "force-dynamic";

// generateMetadata e a página no mesmo request: sem memoizar eram dois POSTs
// ao AniList por visita, sem cache nenhum no caminho do autor (#65, item 6).
const carregarAutor = cache(autorParaPaginaDoSistema);

type Props = {
  params: Promise<{ staffId: string }>;
};

export async function generateMetadata({ params }: Props)
{
  const id = Number((await params).staffId);

  if (!Number.isInteger(id) || id <= 0)
  {
    return { title: "Autor" };
  }

  const resultado = await carregarAutor(id);

  return { title: resultado.estado === "ok" ? resultado.autor.nome : "Autor" };
}

export default async function PaginaDoAutor({ params }: Props)
{
  const id = Number((await params).staffId);

  if (!Number.isInteger(id) || id <= 0)
  {
    notFound();
  }

  const resultado = await carregarAutor(id);

  if (resultado.estado === "nao_encontrado")
  {
    notFound();
  }

  if (resultado.estado === "indisponivel")
  {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          O AniList não respondeu agora. Tente de novo em instantes.
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
          Obras
        </h2>

        {autor.obras.length === 0 ? (
          <p className="text-sm text-texto-suave">
            Nenhuma obra de mangá ou novel registrada no AniList.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {autor.obras.map(function (obra)
            {
              return (
                <li key={obra.anilistId}>
                  <Link
                    href={`/obra/${obra.anilistId}`}
                    className="group flex flex-col gap-1.5"
                  >
                    {obra.coverImageUrl ? (
                      <Image
                        src={obra.coverImageUrl}
                        alt=""
                        width={144}
                        height={216}
                        className="aspect-[2/3] w-full rounded object-cover transition-opacity group-hover:opacity-80"
                        unoptimized
                      />
                    ) : (
                      <div
                        aria-hidden
                        className="flex aspect-[2/3] w-full items-center justify-center rounded bg-superficie text-texto-suave"
                      >
                        —
                      </div>
                    )}
                    <span className="line-clamp-1 text-xs text-texto-suave group-hover:text-texto">
                      {obra.titleEnglish ?? obra.titleRomaji}
                    </span>
                    {obra.startYear !== null && (
                      <span className="text-xs tabular-nums text-texto-suave">
                        {obra.startYear}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
