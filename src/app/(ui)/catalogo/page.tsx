import Image from "next/image";
import { buscarNoCatalogo } from "@/server/services/catalogo.service";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { BotaoEstante } from "./botao-estante";

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
  const resultado = await buscarNoCatalogo(q ?? "");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">Catálogo</h1>
        <p className="text-texto-suave">
          Busque a obra, adicione à estante e a leitura começa a contar.
        </p>
      </header>

      {/* GET: o termo fica na URL, então a busca é compartilhável e recarregável. */}
      <form action="/catalogo" method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={resultado.termo}
          placeholder="Lookism, Solo Leveling, Berserk…"
          aria-label="Buscar obra"
          className="flex-1 rounded-md border border-borda bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
        />
        <button
          type="submit"
          className="rounded-md bg-acento px-4 py-2 text-sm font-medium text-acento-contraste"
        >
          Buscar
        </button>
      </form>

      {resultado.estado === "indisponivel" && (
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          O AniList não respondeu agora. Tente de novo em instantes.
        </p>
      )}

      {resultado.estado === "vazio" && resultado.termo !== "" && (
        <p className="text-sm text-texto-suave">
          Nada encontrado para <strong>{resultado.termo}</strong>.
        </p>
      )}

      {resultado.estado === "ok" && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {resultado.obras.map(function (obra)
          {
            return <Obra key={obra.anilistId} obra={obra} />;
          })}
        </ul>
      )}
    </main>
  );
}

function Obra({ obra }: { obra: MediaDoAniList })
{
  const rotulo = obra.countryOfOrigin ? PAIS[obra.countryOfOrigin] : "Obra";

  return (
    <li className="flex gap-4 rounded-lg border border-borda bg-superficie p-4">
      {obra.coverImageUrl ? (
        <Image
          src={obra.coverImageUrl}
          alt=""
          width={96}
          height={144}
          className="h-36 w-24 shrink-0 rounded object-cover"
          unoptimized
        />
      ) : (
        <div
          aria-hidden
          className="flex h-36 w-24 shrink-0 items-center justify-center rounded bg-fundo text-texto-suave"
        >
          —
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="font-medium leading-snug">
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
          <p className="line-clamp-2 text-sm text-texto-suave">{obra.description}</p>
        )}

        <div className="mt-auto pt-2">
          <BotaoEstante anilistId={obra.anilistId} />
        </div>
      </div>
    </li>
  );
}
