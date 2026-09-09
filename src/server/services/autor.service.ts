/**
 * Caso de uso: a página do autor (issue #43). Leitura ao vivo do AniList,
 * como os similares — sem cache no banco: o AniList responde melhor do que
 * uma tabela nossa responderia, e autor não é dado do usuário.
 */
import type { AutorDoAniList } from "@/server/domain/anilist-media";
import { buscarAutor } from "@/server/infra/anilist";
import { lembrarPorChave } from "@/server/domain/memoria-curta";

export type ResultadoDoAutor =
  | { estado: "ok"; autor: AutorDoAniList }
  | { estado: "nao_encontrado" }
  | { estado: "indisponivel" };

export type DependenciasDoAutor = {
  buscarAutor: (staffId: number) => Promise<AutorDoAniList | null>;
};

/** Nunca levanta — página pública degrada, não estoura. */
export async function autorParaPagina(
  staffId: number,
  deps: DependenciasDoAutor,
): Promise<ResultadoDoAutor>
{
  try
  {
    const autor = await deps.buscarAutor(staffId);

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

/** A composição de produção. */
export function autorParaPaginaDoSistema(
  staffId: number,
): Promise<ResultadoDoAutor>
{
  return autorParaPagina(staffId, { buscarAutor: autorLembrado });
}
