import type { AutorDaObra } from "./anilist-media";

export type ReferenciaDeAutor = { fonte: "kitsu" | "anilist"; id: number };

/** O número antigo continua sendo AniList; IDs Kitsu sempre levam a fonte. */
export function interpretarReferenciaDeAutor(segmentos: readonly string[]): ReferenciaDeAutor | null
{
  if (segmentos.length < 1 || segmentos.length > 2) return null;
  const fonte = segmentos.length === 1 ? "anilist" : segmentos[0];
  const bruto = segmentos[segmentos.length - 1];
  if ((fonte !== "anilist" && fonte !== "kitsu") || !/^\d+$/.test(bruto)) return null;
  const id = Number(bruto);
  return Number.isSafeInteger(id) && id > 0 ? { fonte, id } : null;
}

export function caminhoDoAutor(autor: Pick<AutorDaObra, "anilistStaffId" | "kitsuPersonId">): string | null
{
  if (typeof autor.kitsuPersonId === "number" && Number.isSafeInteger(autor.kitsuPersonId) && autor.kitsuPersonId > 0) return `/autor/kitsu/${autor.kitsuPersonId}`;
  if (typeof autor.anilistStaffId === "number" && Number.isSafeInteger(autor.anilistStaffId) && autor.anilistStaffId > 0) return `/autor/${autor.anilistStaffId}`;
  return null;
}
