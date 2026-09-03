"use client";

/**
 * Uma resenha no perfil público: capa e título da obra, nota, texto (spoiler
 * escondido por padrão) e curtidas. Sem ação — curtir e comentar ficam na
 * página da obra.
 */
import Image from "next/image";
import Link from "next/link";
import { estrelasTexto } from "../../componentes/estrelas";

export type ResenhaParaTela = {
  entryId: string;
  anilistId: number;
  titulo: string;
  coverImageUrl: string | null;
  rating: string | null;
  review: string;
  containsSpoilers: boolean;
  publicadaEm: string;
  curtidas: number;
};

export function ResenhaDoPerfil({ resenha }: { resenha: ResenhaParaTela })
{
  return (
    <li className="flex gap-4 rounded-lg border border-borda bg-superficie p-4">
      <Link href={`/obra/${resenha.anilistId}`} className="shrink-0">
        {resenha.coverImageUrl ? (
          <Image
            src={resenha.coverImageUrl}
            alt=""
            width={64}
            height={96}
            className="h-24 w-16 rounded border border-borda object-cover"
            unoptimized
          />
        ) : (
          <div aria-hidden className="h-24 w-16 rounded border border-borda bg-fundo" />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={`/obra/${resenha.anilistId}`}
            className="font-medium hover:text-acento"
          >
            {resenha.titulo}
          </Link>
          {resenha.rating !== null && (
            <span aria-label={`Nota ${resenha.rating} de 5`} className="text-acento">
              {estrelasTexto(Number(resenha.rating))}
            </span>
          )}
          <span className="text-xs text-texto-suave">{resenha.publicadaEm}</span>
        </p>

        {resenha.containsSpoilers ? (
          <details className="text-sm">
            <summary className="cursor-pointer text-texto-suave">
              Contém spoiler — mostrar
            </summary>
            <p className="mt-2 whitespace-pre-line">{resenha.review}</p>
          </details>
        ) : (
          <p className="line-clamp-4 whitespace-pre-line text-sm">{resenha.review}</p>
        )}

        <p className="text-xs text-texto-suave">
          {resenha.curtidas} {resenha.curtidas === 1 ? "curtida" : "curtidas"}
        </p>
      </div>
    </li>
  );
}
