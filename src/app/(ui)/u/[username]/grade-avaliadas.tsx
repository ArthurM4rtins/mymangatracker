"use client";

/**
 * A grade pública de obras avaliadas: capa, título e a nota embaixo. Client
 * só por causa do glyph da estrela, que vive num módulo client.
 */
import Link from "next/link";
import { estrelasTexto } from "../../componentes/estrelas";
import { Capa } from "./minha-estante";

export type AvaliadaParaTela = {
  anilistId: number;
  titulo: string;
  coverImageUrl: string | null;
  rating: number;
};

export function GradeAvaliadas({ avaliadas }: { avaliadas: AvaliadaParaTela[] })
{
  return (
    <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6">
      {avaliadas.map(function (obra)
      {
        return (
          <li key={obra.anilistId}>
            <Link
              href={`/obra/${obra.anilistId}`}
              className="group flex flex-col gap-1.5"
              title={obra.titulo}
            >
              <Capa src={obra.coverImageUrl} />
              <span className="truncate text-xs">{obra.titulo}</span>
              <span
                aria-label={`Nota ${obra.rating} de 5`}
                className="text-xs text-acento"
              >
                {estrelasTexto(obra.rating)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
