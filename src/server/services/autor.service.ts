/**
 * Caso de uso: a página do autor (issue #43). Leitura ao vivo do AniList,
 * como os similares — sem cache no banco: o AniList responde melhor do que
 * uma tabela nossa responderia, e autor não é dado do usuário.
 */
import type { AutorDoAniList } from "@/server/domain/anilist-media";
import { buscarAutor } from "@/server/infra/anilist";

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

/** A composição de produção. */
export function autorParaPaginaDoSistema(
  staffId: number,
): Promise<ResultadoDoAutor>
{
  return autorParaPagina(staffId, { buscarAutor });
}
