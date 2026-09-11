/**
 * Buscar uma obra na fonte dela, seja qual for (#254).
 *
 * Existe porque a mesma escada estava escrita três vezes — estante, lista e
 * página da obra —, cada uma sabendo que "o AniList é o primário e o Kitsu é o
 * degrau de baixo". Com a obra podendo nascer no Kitsu, a escada ficou com dois
 * caminhos e duplicá-la de novo era pedir para um deles ficar para trás.
 *
 * A escada, por referência:
 *
 * - `anilist` → AniList; se ele cair, Kitsu pelo mapeamento (#219).
 * - `kitsu` → Kitsu direto pelo id dele. Não há degrau de baixo: o AniList não
 *   conhece essa obra, e é justamente por isso que ela é chamada pelo Kitsu.
 *
 * Levanta quando a fonte falha, para quem chama distinguir "obra não existe" de
 * "não deu para perguntar" — a diferença entre descartar e pedir para tentar
 * depois.
 */
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import type { FonteDaObra, ReferenciaDaObra } from "@/server/domain/referencia-da-obra";
import { buscarMediaPorId } from "@/server/infra/anilist";
import { buscarNoKitsuPorAnilistId, buscarNoKitsuPorId } from "@/server/infra/kitsu";

export type DependenciasDaFonte = {
  noAniList: (anilistId: number) => Promise<MediaDoAniList | null>;
  noKitsuPorAniList: (anilistId: number) => Promise<MediaDoAniList | null>;
  noKitsuPorId: (kitsuId: number) => Promise<MediaDoAniList | null>;
};

export const FONTES_DE_PRODUCAO: DependenciasDaFonte = {
  noAniList: buscarMediaPorId,
  noKitsuPorAniList: buscarNoKitsuPorAnilistId,
  noKitsuPorId: buscarNoKitsuPorId,
};

export type ResultadoDaFonte =
  /**
   * A obra, ou `null` quando a fonte respondeu e ela não existe. `respondeu`
   * diz QUAL fonte respondeu: o Kitsu não conhecer uma obra do AniList não
   * prova que ela sumiu — ele tem bem menos obras —, e quem chama precisa
   * dessa diferença para não trocar cache velho por 404.
   */
  | { estado: "ok"; obra: MediaDoAniList | null; respondeu: FonteDaObra }
  /** Ninguém respondeu. Não é "não existe": é "não deu para perguntar". */
  | { estado: "indisponivel" };

export async function buscarObraNaFonte(
  referencia: ReferenciaDaObra,
  deps: DependenciasDaFonte = FONTES_DE_PRODUCAO,
): Promise<ResultadoDaFonte>
{
  if (referencia.fonte === "kitsu")
  {
    try
    {
      return { estado: "ok", obra: await deps.noKitsuPorId(referencia.id), respondeu: "kitsu" };
    }
    catch
    {
      return { estado: "indisponivel" };
    }
  }

  try
  {
    return { estado: "ok", obra: await deps.noAniList(referencia.id), respondeu: "anilist" };
  }
  catch
  {
    // O AniList caiu. Desce um degrau (#219), pelo mapeamento.
    try
    {
      return { estado: "ok", obra: await deps.noKitsuPorAniList(referencia.id), respondeu: "kitsu" };
    }
    catch
    {
      return { estado: "indisponivel" };
    }
  }
}
