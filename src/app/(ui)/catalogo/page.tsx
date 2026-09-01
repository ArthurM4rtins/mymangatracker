import Image from "next/image";
import { buscarNoCatalogo } from "@/server/services/catalogo.service";
import { anilistIdsNaEstanteDoSistema } from "@/server/services/estante.service";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { usuarioDaSessao } from "../../api/v1/_shared/sessao";
import { BotaoEstante } from "./botao-estante";
import { BuscaCatalogo } from "./busca-catalogo";

// A busca depende do termo da URL e do AniList: nada aqui é pré-renderizável.
export const dynamic = "force-dynamic";

export const metadata = { title: "Catálogo" };

const PAIS: Record<string, string> = {
  JP: "Mangá",
  KR: "Manhwa",
  CN: "Manhua",
};

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function Catalogo({ searchParams }: Props)
{
  const { q } = await searchParams;
  const [resultado, naEstante] = await Promise.all([
    buscarNoCatalogo(q ?? ""),
    idsNaEstante(),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">Catálogo</h1>
        <p className="text-texto-suave">
          Busque a obra, adicione à estante e a leitura começa a contar.
        </p>
      </header>

      <BuscaCatalogo termoInicial={resultado.termo} />

      {resultado.estado === "indisponivel" && (
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          O AniList não respondeu agora. Tente de novo em instantes.
        </p>
      )}

      {resultado.estado === "vazio" && (
        <p className="text-sm text-texto-suave">
          {resultado.termo === "" ? (
            "O catálogo não respondeu nada agora. Tente de novo em instantes."
          ) : (
            <>Nada encontrado para <strong>{resultado.termo}</strong>.</>
          )}
        </p>
      )}

      {(resultado.estado === "ok" || resultado.estado === "destaques") && (
        <section className="flex flex-col gap-4">
          {resultado.estado === "destaques" && (
            <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
              Populares agora
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

function Obra({ obra, jaNaEstante }: { obra: MediaDoAniList; jaNaEstante: boolean })
{
  const rotulo = obra.countryOfOrigin ? PAIS[obra.countryOfOrigin] : "Obra";

  return (
    <li className="group flex gap-4 rounded-lg border border-borda bg-superficie p-4 transition-colors hover:border-acento/60">
      {obra.coverImageUrl ? (
        <Image
          src={obra.coverImageUrl}
          alt=""
          width={112}
          height={168}
          className="h-42 w-28 shrink-0 rounded-md object-cover shadow-sm"
          unoptimized
        />
      ) : (
        <div
          aria-hidden
          className="flex h-42 w-28 shrink-0 items-center justify-center rounded-md bg-fundo text-texto-suave"
        >
          —
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="line-clamp-2 font-medium leading-snug">
          {obra.titleEnglish ?? obra.titleRomaji}
        </h2>

        <p className="flex flex-wrap items-center gap-1.5 text-xs text-texto-suave">
          <span className="rounded-full border border-borda px-2 py-0.5">
            {obra.type === "NOVEL" ? "Novel" : rotulo}
          </span>
          {obra.chapters !== undefined && (
            <span className="tabular-nums">{obra.chapters} capítulos</span>
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
