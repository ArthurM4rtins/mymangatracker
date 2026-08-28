import Image from "next/image";
import Link from "next/link";
import { buscarNoCatalogo } from "@/server/services/catalogo.service";
import type { MediaDoAniList } from "@/server/domain/anilist-media";

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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <Link href="/" className="w-fit text-sm text-neutral-500 underline underline-offset-4">
          ← Início
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Catálogo</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Busca no AniList. Funciona sem banco — nada é gravado nesta tela.
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
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          className="rounded-md border border-neutral-900 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white dark:border-neutral-100 dark:hover:bg-neutral-100 dark:hover:text-neutral-900"
        >
          Buscar
        </button>
      </form>

      {resultado.estado === "indisponivel" && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          O AniList não respondeu agora. Tente de novo em instantes.
        </p>
      )}

      {resultado.estado === "vazio" && resultado.termo !== "" && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Nada encontrado para <strong>{resultado.termo}</strong>.
        </p>
      )}

      {resultado.estado === "ok" && (
        <ul className="flex flex-col gap-4">
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
    <li className="flex gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      {obra.coverImageUrl && (
        <Image
          src={obra.coverImageUrl}
          alt=""
          width={64}
          height={96}
          className="h-24 w-16 shrink-0 rounded object-cover"
          unoptimized
        />
      )}

      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-medium">{obra.titleEnglish ?? obra.titleRomaji}</h2>

        <p className="text-xs text-neutral-500">
          {rotulo}
          {obra.type === "NOVEL" && " · Novel"}
          {obra.chapters !== undefined && ` · ${obra.chapters} capítulos`}
        </p>

        {obra.description && (
          <p className="line-clamp-3 text-sm text-neutral-600 dark:text-neutral-400">
            {obra.description}
          </p>
        )}
      </div>
    </li>
  );
}
