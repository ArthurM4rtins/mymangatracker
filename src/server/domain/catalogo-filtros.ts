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

/**
 * O termo vai cru para a query do AniList e e escolhido por quem chama (#134).
 * Sem teto, um `?q=` gigante vira corpo de requisicao do mesmo tamanho contra a
 * cota compartilhada de todo o app. Cem caracteres passa de qualquer titulo real.
 */
const TAMANHO_MAXIMO_DO_TERMO = 100;

const TIPOS: TipoDeObra[] = ["manga", "manhwa", "manhua", "novel"];
const ORDENS: OrdemDoCatalogo[] = ["popular", "nota", "alta", "recente"];

/**
 * O mesmo parâmetro repetido na URL (`?q=um&q=dois`) chega como array, e o tipo
 * declarado não impede isso — quem preenche é a requisição, não o compilador
 * (issue #145). Fica com o primeiro valor, na forma que `interpretarOrdemDasListas`
 * já usa em `lista-listagem.ts`.
 */
function primeiro(valor: unknown): string | undefined
{
  if (typeof valor === "string")
  {
    return valor;
  }

  return Array.isArray(valor) && typeof valor[0] === "string" ? valor[0] : undefined;
}

export function interpretarFiltros(
  params: Record<string, string | string[] | undefined>,
): FiltroDoCatalogo
{
  const q = primeiro(params.q);
  const tipo = primeiro(params.tipo);
  const genero = primeiro(params.genero);
  const ordem = primeiro(params.ordem);

  const filtro: FiltroDoCatalogo = {
    termo: q?.trim().slice(0, TAMANHO_MAXIMO_DO_TERMO) ?? "",
    ordem: (ORDENS as string[]).includes(ordem ?? "")
      ? (ordem as OrdemDoCatalogo)
      : "popular",
  };

  if ((TIPOS as string[]).includes(tipo ?? ""))
  {
    filtro.tipo = tipo as TipoDeObra;
  }

  if ((GENEROS as readonly string[]).includes(genero ?? ""))
  {
    filtro.genero = genero;
  }

  const decada = Number(primeiro(params.decada));

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
