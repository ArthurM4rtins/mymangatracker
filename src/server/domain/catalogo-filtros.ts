/**
 * Os filtros do catálogo (issue #37). Vêm da URL, então TUDO passa por
 * whitelist — valor desconhecido é descartado em silêncio, nunca erro nem
 * repasse cru para a API de terceiro.
 */

export type TipoDeObra = "manga" | "manhwa" | "manhua" | "novel";
export type OrdemDoCatalogo = "popular" | "nota" | "alta" | "recente";

export type FiltroDoCatalogo = {
  termo: string;
  tipo?: TipoDeObra;
  genero?: string;
  decada?: number;
  ordem: OrdemDoCatalogo;
};

/** A lista de gêneros do AniList — estável o bastante para viver fixa aqui. */
export const GENEROS = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
] as const;

export const DECADAS = [2020, 2010, 2000, 1990, 1980, 1970, 1960, 1950] as const;

const TIPOS: TipoDeObra[] = ["manga", "manhwa", "manhua", "novel"];
const ORDENS: OrdemDoCatalogo[] = ["popular", "nota", "alta", "recente"];

export function interpretarFiltros(params: {
  q?: string;
  tipo?: string;
  genero?: string;
  decada?: string;
  ordem?: string;
}): FiltroDoCatalogo
{
  const filtro: FiltroDoCatalogo = {
    termo: params.q?.trim() ?? "",
    ordem: (ORDENS as string[]).includes(params.ordem ?? "")
      ? (params.ordem as OrdemDoCatalogo)
      : "popular",
  };

  if ((TIPOS as string[]).includes(params.tipo ?? ""))
  {
    filtro.tipo = params.tipo as TipoDeObra;
  }

  if ((GENEROS as readonly string[]).includes(params.genero ?? ""))
  {
    filtro.genero = params.genero;
  }

  const decada = Number(params.decada);

  if ((DECADAS as readonly number[]).includes(decada))
  {
    filtro.decada = decada;
  }

  return filtro;
}

/** Além do termo: decide se o catálogo mostra a busca filtrada ou a vitrine. */
export function temFiltroAtivo(filtro: FiltroDoCatalogo): boolean
{
  return (
    filtro.tipo !== undefined ||
    filtro.genero !== undefined ||
    filtro.decada !== undefined ||
    filtro.ordem !== "popular"
  );
}
