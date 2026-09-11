/**
 * Perfil de autor pela fonte da sua identidade. IDs de pessoas não têm o
 * mesmo mapeamento que IDs de obras; nunca reutilizar o número entre fontes.
 */
import type { AutorDoAniList } from "@/server/domain/anilist-media";
import { buscarAutor } from "@/server/infra/anilist";
import { buscarAutorNoKitsu } from "@/server/infra/kitsu";
import type { AutorDoKitsu } from "@/server/domain/kitsu-autor";
import type { ReferenciaDeAutor } from "@/server/domain/referencia-de-autor";
import { lembrarPorChave } from "@/server/domain/memoria-curta";

export type ResultadoDoAutor =
  | { estado: "ok"; autor: AutorDoAniList | AutorDoKitsu }
  | { estado: "nao_encontrado" }
  | { estado: "indisponivel" };

export type DependenciasDoAutor = {
  buscarAutor: (staffId: number) => Promise<AutorDoAniList | null>;
  buscarNoKitsu?: (personId: number) => Promise<AutorDoKitsu | null>;
};

/** Nunca levanta — página pública degrada, não estoura. */
export async function autorParaPagina(
  staffId: number | ReferenciaDeAutor,
  deps: DependenciasDoAutor,
): Promise<ResultadoDoAutor>
{
  try
  {
    const referencia = typeof staffId === "number" ? { fonte: "anilist" as const, id: staffId } : staffId;
    if (!Number.isSafeInteger(referencia.id) || referencia.id <= 0) return { estado: "nao_encontrado" };
    const buscar = referencia.fonte === "kitsu" ? deps.buscarNoKitsu : deps.buscarAutor;
    if (!buscar) return { estado: "indisponivel" };
    const autor = await buscar(referencia.id);

    return autor === null
      ? { estado: "nao_encontrado" }
      : { estado: "ok", autor };
  }
  catch
  {
    return { estado: "indisponivel" };
  }
}

/**
 * Autor e similares mudam devagar e o id vem da URL: caminhar por ids era uma
 * requisição nova ao AniList por id, sem teto, do IP único do deploy (#134).
 * Cinco minutos por id, com teto de chaves para o mapa não crescer sem limite.
 */
const JANELA_MS = 5 * 60_000;
const MAXIMO_DE_IDS = 200;

// No escopo do módulo, não dentro da composição: recriado a cada chamada, o
// memo não lembraria nada.
const autorLembrado = lembrarPorChave(buscarAutor, JANELA_MS, MAXIMO_DE_IDS);
const autorKitsuLembrado = lembrarPorChave(buscarAutorNoKitsu, JANELA_MS, MAXIMO_DE_IDS);

/** A composição de produção. */
export function autorParaPaginaDoSistema(
  staffId: number | ReferenciaDeAutor,
): Promise<ResultadoDoAutor>
{
  return autorParaPagina(staffId, { buscarAutor: autorLembrado, buscarNoKitsu: autorKitsuLembrado });
}
