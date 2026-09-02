import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listaComItensDoSistema } from "@/server/services/lista.service";
import { usuarioDaSessao } from "../../../api/v1/_shared/sessao";
import { ApagarLista, RemoverDaLista } from "./acoes-da-lista";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props)
{
  const { id } = await params;
  const lista = await listaComItensDoSistema(id, null).catch(function () { return null; });

  return { title: lista?.nome ?? "Lista" };
}

export default async function PaginaDaLista({ params }: Props)
{
  const { id } = await params;
  const userId = await usuarioDaSessao();
  const lista = await listaComItensDoSistema(id, userId).catch(function () { return null; });

  if (lista === null)
  {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">{lista.nome}</h1>
        <p className="text-xs text-texto-suave">
          por{" "}
          <Link href={`/u/${lista.username}`} className="hover:text-acento hover:underline">
            {lista.username}
          </Link>{" "}
          · {lista.itens.length}{" "}
          {lista.itens.length === 1 ? "obra" : "obras"}
        </p>
        {lista.descricao && (
          <p className="max-w-2xl text-sm text-texto-suave">{lista.descricao}</p>
        )}
        {lista.minha && <ApagarLista listaId={lista.listaId} />}
      </header>

      {lista.itens.length === 0 ? (
        <p className="text-sm text-texto-suave">
          Lista vazia — adicione obras pelo botão de lista na página de cada obra.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {lista.itens.map(function (item)
          {
            return (
              <li key={item.anilistId} className="flex flex-col gap-1">
                <Link
                  href={`/obra/${item.anilistId}`}
                  className="group flex flex-col gap-1.5"
                >
                  {item.coverImageUrl ? (
                    <Image
                      src={item.coverImageUrl}
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
                    {item.titleEnglish ?? item.titleRomaji}
                  </span>
                </Link>
                {lista.minha && (
                  <RemoverDaLista listaId={lista.listaId} anilistId={item.anilistId} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
