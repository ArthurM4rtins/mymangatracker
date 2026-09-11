/**
 * Consulta compartilhada por obra, estante e listas: Kitsu primeiro.
 * Referências antigas do AniList são resolvidas pelo mapeamento do Kitsu;
 * falha ou ausência desse mapeamento permite recorrer ao AniList.
 * Links Kitsu só têm fallback quando já conhecemos o id correspondente.
 */
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import type { FonteDaObra, ReferenciaDaObra } from "@/server/domain/referencia-da-obra";
import { buscarMediaPorId } from "@/server/infra/anilist";
import { buscarNoKitsuPorAnilistId, buscarNoKitsuPorId } from "@/server/infra/kitsu";
import { buscarMediaCompletaPorReferencia } from "@/server/repositories/media.repository";

export type DependenciasDaFonte = {
  noAniList: (anilistId: number) => Promise<MediaDoAniList | null>;
  noKitsuPorAniList: (anilistId: number) => Promise<MediaDoAniList | null>;
  noKitsuPorId: (kitsuId: number) => Promise<MediaDoAniList | null>;
  anilistIdDoKitsu?: (kitsuId: number) => Promise<number | null>;
};

export const FONTES_DE_PRODUCAO: DependenciasDaFonte = {
  noAniList: buscarMediaPorId,
  noKitsuPorAniList: buscarNoKitsuPorAnilistId,
  noKitsuPorId: buscarNoKitsuPorId,
  anilistIdDoKitsu: async function (kitsuId)
  {
    const cache = await buscarMediaCompletaPorReferencia({ fonte: "kitsu", id: kitsuId });
    return cache?.anilistId ?? null;
  },
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
      try
      {
        const anilistId = await deps.anilistIdDoKitsu?.(referencia.id);
        if (anilistId === undefined || anilistId === null)
        {
          return { estado: "indisponivel" };
        }
        const obra = await deps.noAniList(anilistId);
        return {
          estado: "ok",
          obra: obra === null ? null : { ...obra, kitsuId: referencia.id },
          respondeu: "anilist",
        };
      }
      catch
      {
        return { estado: "indisponivel" };
      }
    }
  }

  let kitsuRespondeu = false;
  try
  {
    const obra = await deps.noKitsuPorAniList(referencia.id);
    kitsuRespondeu = true;
    if (obra !== null)
    {
      return { estado: "ok", obra, respondeu: "kitsu" };
    }
  }
  catch
  {
    // O Kitsu falhou. O id da referência ainda permite consultar o AniList.
  }

  try
  {
    return { estado: "ok", obra: await deps.noAniList(referencia.id), respondeu: "anilist" };
  }
  catch
  {
    // Ausência de mapeamento não prova que a obra do AniList deixou de existir.
    return kitsuRespondeu
      ? { estado: "ok", obra: null, respondeu: "kitsu" }
      : { estado: "indisponivel" };
  }
}
