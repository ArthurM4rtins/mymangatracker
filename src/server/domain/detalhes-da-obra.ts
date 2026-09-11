/** Metadados editoriais, independentes do progresso pessoal. */
export const STATUS_PUBLICACAO = ["current", "finished", "upcoming", "unreleased", "tba", "hiatus", "cancelled"] as const;
export type StatusPublicacao = typeof STATUS_PUBLICACAO[number];
export const TEMAS = ["military", "demon", "dark-fantasy", "revenge", "dystopia", "swordplay"] as const;
export const TAG_ANILIST: Record<typeof TEMAS[number], string> = {
  military: "Military", demon: "Demons", "dark-fantasy": "Dark Fantasy",
  revenge: "Revenge", dystopia: "Dystopian", swordplay: "Swordplay",
};
export const RELACOES = ["sequel", "prequel", "alternative_setting", "alternative_version", "side_story", "parent_story", "summary", "full_story", "spinoff", "adaptation", "character", "other"] as const;
export type ObraRelacionada = {
  chave: string;
  titulo: string;
  capa: string | null;
  tipo: "MANGA" | "NOVEL";
  relacao: typeof RELACOES[number];
};
export type DetalhesDaObra = {
  version: 1;
  status?: StatusPublicacao;
  volumes?: number;
  startDate?: string;
  endDate?: string;
  subtype?: string;
  aliases: string[];
  categories: string[];
  related: ObraRelacionada[];
};

export function dataDePublicacao(valor: unknown): string | undefined
{
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return undefined;
  const data = new Date(`${valor}T00:00:00Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor ? valor : undefined;
}

/** JSON versionado escrito pelos adaptadores. Cache anterior pede hidratação. */
export function detalhesDoJson(valor: unknown): DetalhesDaObra | null
{
  if (typeof valor !== "object" || valor === null) return null;
  const d = valor as Partial<DetalhesDaObra>;
  if (d.version !== 1 || !Array.isArray(d.aliases) || !Array.isArray(d.categories) || !Array.isArray(d.related)) return null;
  return d as DetalhesDaObra;
}

/** Uma resposta parcial não apaga o enriquecimento já conhecido. */
export function mesclarDetalhes(antigo: DetalhesDaObra | null | undefined, novo: DetalhesDaObra | undefined): DetalhesDaObra | undefined
{
  if (!novo) return antigo ?? undefined;
  if (!antigo) return novo;
  return {
    ...antigo, ...novo,
    aliases: [...new Set([...novo.aliases, ...antigo.aliases])].slice(0, 30),
    categories: novo.categories.length ? novo.categories : antigo.categories,
    related: novo.related.length ? novo.related : antigo.related,
  };
}
