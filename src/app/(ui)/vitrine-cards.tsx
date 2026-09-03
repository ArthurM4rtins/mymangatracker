"use client";

/**
 * Os cards da vitrine da home (issue #76): resenha e lista em largura fixa
 * para o carrossel. Client só pelo glyph da estrela; nenhuma ação aqui.
 */
import Image from "next/image";
import Link from "next/link";
import { estrelasTexto } from "./componentes/estrelas";

export function CardResenha({
  username,
  anilistId,
  titulo,
  coverImageUrl,
  rating,
  review,
  containsSpoilers,
  curtidas,
  quando,
}: {
  username: string;
  anilistId: number;
  titulo: string;
  coverImageUrl: string | null;
  rating: string | null;
  review: string;
  containsSpoilers: boolean;
  curtidas: number;
  quando: string;
})
{
  return (
    // Altura fixa: no carrossel os cards são absolutos e não têm referência de
    // altura; sem isso cada um fica do tamanho do próprio texto.
    <article className="flex h-56 w-72 flex-col gap-2 rounded-lg border border-borda bg-superficie p-3">
      <div className="flex gap-3">
        <Link href={`/obra/${anilistId}`} className="shrink-0">
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt=""
              width={48}
              height={72}
              className="h-[72px] w-12 rounded border border-borda object-cover"
              unoptimized
            />
          ) : (
            <div aria-hidden className="h-[72px] w-12 rounded border border-borda bg-fundo" />
          )}
        </Link>
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link href={`/obra/${anilistId}`} className="line-clamp-2 text-sm font-medium hover:text-acento">
            {titulo}
          </Link>
          {rating !== null && (
            <span aria-label={`Nota ${rating} de 5`} className="text-xs text-nota">
              {estrelasTexto(Number(rating))}
            </span>
          )}
          <span className="text-xs text-texto-suave">
            <Link href={`/u/${username}`} className="font-medium text-texto hover:text-acento">
              {username}
            </Link>{" "}
            · {quando}
          </span>
        </div>
      </div>
      {containsSpoilers ? (
        <p className="text-xs italic text-texto-suave">Contém spoiler — leia na página da obra.</p>
      ) : (
        <p className="line-clamp-3 text-sm text-texto-suave">{review}</p>
      )}
      <span className="mt-auto text-xs text-texto-suave">
        <span aria-hidden>♥</span> {curtidas}
        <span className="sr-only">{curtidas === 1 ? "curtida" : "curtidas"}</span>
      </span>
    </article>
  );
}

export function CardLista({
  listaId,
  username,
  nome,
  totalDeObras,
  capas,
  curtidas,
  descricao,
  fluido = false,
}: {
  listaId: string;
  username: string;
  nome: string;
  totalDeObras: number;
  capas: Array<string | null>;
  curtidas: number;
  /** Só na grade de /listas (issue #80); o carrossel não tem espaço. */
  descricao?: string | null;
  /** Largura da célula da grade em vez da fixa do carrossel. */
  fluido?: boolean;
})
{
  return (
    <article
      className={`flex flex-col gap-2 rounded-lg border border-borda bg-superficie p-3 transition-colors hover:border-acento/60 ${
        fluido ? "h-full w-full" : "h-48 w-60"
      }`}
    >
      <Link href={`/listas/${listaId}`} className="flex -space-x-6">
        {capas.length === 0 ? (
          <div aria-hidden className="h-[96px] w-16 rounded border border-borda bg-fundo" />
        ) : (
          capas.slice(0, 4).map(function (capa, indice)
          {
            return capa ? (
              <Image
                key={indice}
                src={capa}
                alt=""
                width={64}
                height={96}
                className="h-[96px] w-16 rounded border border-borda object-cover shadow"
                unoptimized
              />
            ) : (
              <div key={indice} aria-hidden className="h-[96px] w-16 rounded border border-borda bg-fundo" />
            );
          })
        )}
      </Link>
      <Link href={`/listas/${listaId}`} className="line-clamp-2 text-sm font-medium hover:text-acento">
        {nome}
      </Link>
      {descricao && <p className="line-clamp-2 text-xs text-texto-suave">{descricao}</p>}
      <span className="mt-auto text-xs text-texto-suave">
        <Link href={`/u/${username}`} className="font-medium text-texto hover:text-acento">
          {username}
        </Link>{" "}
        · {totalDeObras} {totalDeObras === 1 ? "obra" : "obras"} · <span aria-hidden>♥</span> {curtidas}
        <span className="sr-only">{curtidas === 1 ? "curtida" : "curtidas"}</span>
      </span>
    </article>
  );
}
