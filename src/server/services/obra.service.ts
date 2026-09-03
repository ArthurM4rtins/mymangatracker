/**
 * Caso de uso: a página da obra — sinopse, ano, autores, gêneros, similares e
 * o recorte do usuário logado (entrada, fonte, avaliação).
 *
 * Cache com o mesmo TTL da estante; mas a página é LEITURA: AniList fora
 * serve o cache que houver, mesmo velho, e só é indisponível sem cache nenhum.
 */
import { cacheEstaFresco } from "@/server/domain/media-cache";
import {
  resumirNotas,
  type ContagemDeNota,
  type ResumoDeNotas,
} from "@/server/domain/nota-media";
import {
  proximoCapitulo,
  tipoDaFonte,
  urlDaPagina,
} from "@/server/domain/progresso";
import type { AutorDaObra, MediaDoAniList } from "@/server/domain/anilist-media";
import { buscarMediaPorId, buscarSimilares } from "@/server/infra/anilist";
import {
  buscarMediaCompletaPorAnilistId,
  salvarMediaDoAniList,
  type MediaCompleta,
} from "@/server/repositories/media.repository";
import { buscarEntradaPorMedia } from "@/server/repositories/shelf.repository";
import { buscarFonteAtiva } from "@/server/repositories/reading-source.repository";
import {
  listarAberturas,
  type AberturaDoHistorico,
} from "@/server/repositories/reading-progress.repository";
import {
  buscarAvaliacao,
  contarNotasPorValor,
} from "@/server/repositories/avaliacao.repository";
import {
  listarReviewsDaObra,
  type ReviewPublica,
} from "@/server/repositories/review-social.repository";

/** O que a página mostra da obra. Contrato — sem id interno, sem syncedAt. */
export type ObraDaPagina = {
  anilistId: number;
  type: "MANGA" | "NOVEL";
  countryOfOrigin: string | null;
  titleRomaji: string;
  titleEnglish: string | null;
  titleNative: string | null;
  coverImageUrl: string | null;
  bannerImageUrl: string | null;
  description: string | null;
  chapters: number | null;
  startYear: number | null;
  genres: string[];
  averageScore: number | null;
  autores: AutorDaObra[];
};

/** O card de similar — o mínimo para capa + link. */
export type ObraSimilar = {
  anilistId: number;
  titleRomaji: string;
  titleEnglish: string | null;
  coverImageUrl: string | null;
};

export type MinhaRelacao = {
  entradaId: string;
  status: "READING" | "COMPLETED" | "PLANNED" | "PAUSED" | "DROPPED";
  progressChapter: string | null;
  proximoCapitulo: number;
  fonte:
    | { sourceHost: string; tipo: "template" }
    | { sourceHost: string; tipo: "pagina"; urlDaObra: string }
    | null;
  /** O histórico de aberturas DO DONO (issue #54), do mais recente ao mais antigo. */
  historico: AberturaDoHistorico[];
};

/** Avaliar não exige estante (issue #45) — a avaliação anda separada. */
export type MinhaAvaliacao = {
  rating: string | null;
  review: string | null;
  containsSpoilers: boolean;
};

export type ResultadoDaObra =
  | {
      estado: "ok";
      obra: ObraDaPagina;
      similares: ObraSimilar[];
      minha: MinhaRelacao | null;
      minhaAvaliacao: MinhaAvaliacao | null;
      reviews: ReviewPublica[];
      /** A média dos NOSSOS usuários (issue #48). `null` sem nota ou com o agregado fora. */
      notaDoKidoku: ResumoDeNotas | null;
    }
  | { estado: "nao_encontrada" }
  | { estado: "indisponivel" };

export type DependenciasDaObra = {
  buscarCompleta: (anilistId: number) => Promise<MediaCompleta | null>;
  buscarNoAniList: (anilistId: number) => Promise<MediaDoAniList | null>;
  salvarMedia: (
    obra: MediaDoAniList,
    sincronizadoEm: Date,
  ) => Promise<{ id: string; syncedAt: Date }>;
  buscarSimilares: (anilistId: number) => Promise<MediaDoAniList[]>;
  buscarEntrada: (
    userId: string,
    mediaId: string,
  ) => Promise<{
    entradaId: string;
    status: MinhaRelacao["status"];
    progressChapter: string | null;
  } | null>;
  buscarFonte: (
    userId: string,
    mediaId: string,
  ) => Promise<{ id: string; sourceHost: string; urlTemplate: string } | null>;
  buscarAvaliacao: (
    userId: string,
    mediaId: string,
  ) => Promise<{
    mediaId: string;
    rating: string | null;
    review: string | null;
    containsSpoilers: boolean;
  } | null>;
  listarReviews: (
    mediaId: string,
    userId: string | null,
  ) => Promise<ReviewPublica[]>;
  contarNotas: (mediaId: string) => Promise<ContagemDeNota[]>;
  listarAberturas: (
    userId: string,
    mediaId: string,
    limite: number,
  ) => Promise<AberturaDoHistorico[]>;
  relogio?: () => Date;
};

/** Quantas aberturas o painel da obra mostra. O resto fica no banco. */
const LIMITE_DO_HISTORICO = 20;

export async function obraParaPagina(
  anilistId: number,
  userId: string | null,
  deps: DependenciasDaObra,
): Promise<ResultadoDaObra>
{
  const agora = deps.relogio?.() ?? new Date();

  let cache = await deps.buscarCompleta(anilistId);

  if (cache === null || !cacheEstaFresco(cache.syncedAt, agora))
  {
    try
    {
      const doAniList = await deps.buscarNoAniList(anilistId);

      if (doAniList === null)
      {
        // O AniList respondeu e a obra não existe (ou o domínio descartou).
        // Cache antigo de algo que sumiu não ressuscita a página.
        return { estado: "nao_encontrada" };
      }

      const salvo = await deps.salvarMedia(doAniList, agora);
      cache = {
        id: salvo.id,
        anilistId: doAniList.anilistId,
        type: doAniList.type,
        countryOfOrigin: doAniList.countryOfOrigin ?? null,
        titleRomaji: doAniList.titleRomaji,
        titleEnglish: doAniList.titleEnglish ?? null,
        titleNative: doAniList.titleNative ?? null,
        coverImageUrl: doAniList.coverImageUrl ?? null,
        bannerImageUrl: doAniList.bannerImageUrl ?? null,
        description: doAniList.description ?? null,
        chapters: doAniList.chapters ?? null,
        startYear: doAniList.startYear ?? null,
        genres: doAniList.genres ?? [],
        averageScore: doAniList.averageScore ?? null,
        autores: doAniList.autores ?? [],
        syncedAt: salvo.syncedAt,
      };
    }
    catch
    {
      // AniList fora. Página é leitura: cache velho serve; sem cache, não há página.
      if (cache === null)
      {
        return { estado: "indisponivel" };
      }
    }
  }

  const [similares, minha, minhaAvaliacao, reviews, contagens] = await Promise.all([
    similaresSemDerrubar(anilistId, deps),
    userId === null ? Promise.resolve(null) : minhaRelacao(userId, cache.id, deps),
    // Avaliar não exige estante — a avaliação anda separada do recorte.
    userId === null
      ? Promise.resolve(null)
      : deps.buscarAvaliacao(userId, cache.id).then(function (avaliacao)
        {
          return avaliacao === null
            ? null
            : {
                rating: avaliacao.rating,
                review: avaliacao.review,
                containsSpoilers: avaliacao.containsSpoilers,
              };
        }),
    // Social falhando não derruba a obra — a seção some.
    deps.listarReviews(cache.id, userId).catch(function () { return []; }),
    // Agregado falhando não derruba a obra — a nota some.
    deps.contarNotas(cache.id).catch(function (): ContagemDeNota[] { return []; }),
  ]);

  const obra: ObraDaPagina = {
    anilistId: cache.anilistId,
    type: cache.type,
    countryOfOrigin: cache.countryOfOrigin,
    titleRomaji: cache.titleRomaji,
    titleEnglish: cache.titleEnglish,
    titleNative: cache.titleNative,
    coverImageUrl: cache.coverImageUrl,
    bannerImageUrl: cache.bannerImageUrl,
    description: cache.description,
    chapters: cache.chapters,
    startYear: cache.startYear,
    genres: cache.genres,
    averageScore: cache.averageScore,
    autores: cache.autores,
  };

  return {
    estado: "ok",
    obra,
    similares,
    minha,
    minhaAvaliacao,
    reviews,
    notaDoKidoku: resumirNotas(contagens),
  };
}

async function similaresSemDerrubar(
  anilistId: number,
  deps: DependenciasDaObra,
): Promise<ObraSimilar[]>
{
  try
  {
    const obras = await deps.buscarSimilares(anilistId);

    return obras.map(function (obra)
    {
      return {
        anilistId: obra.anilistId,
        titleRomaji: obra.titleRomaji,
        titleEnglish: obra.titleEnglish ?? null,
        coverImageUrl: obra.coverImageUrl ?? null,
      };
    });
  }
  catch
  {
    return [];
  }
}

async function minhaRelacao(
  userId: string,
  mediaId: string,
  deps: DependenciasDaObra,
): Promise<MinhaRelacao | null>
{
  const entrada = await deps.buscarEntrada(userId, mediaId);

  if (entrada === null)
  {
    return null;
  }

  const [fonte, historico] = await Promise.all([
    deps.buscarFonte(userId, mediaId),
    // Histórico falhando não derruba o painel — a lista some.
    deps
      .listarAberturas(userId, mediaId, LIMITE_DO_HISTORICO)
      .catch(function (): AberturaDoHistorico[] { return []; }),
  ]);

  const maior =
    entrada.progressChapter === null ? null : Number(entrada.progressChapter);

  return {
    entradaId: entrada.entradaId,
    status: entrada.status,
    progressChapter: entrada.progressChapter,
    proximoCapitulo: proximoCapitulo(maior),
    historico,
    fonte:
      fonte === null
        ? null
        : tipoDaFonte(fonte.urlTemplate) === "template"
          ? { sourceHost: fonte.sourceHost, tipo: "template" }
          : {
              sourceHost: fonte.sourceHost,
              tipo: "pagina",
              urlDaObra: urlDaPagina(fonte.sourceHost, fonte.urlTemplate),
            },
  };
}

/** A composição de produção. */
export function obraParaPaginaDoSistema(
  anilistId: number,
  userId: string | null,
): Promise<ResultadoDaObra>
{
  return obraParaPagina(anilistId, userId, {
    buscarCompleta: buscarMediaCompletaPorAnilistId,
    buscarNoAniList: buscarMediaPorId,
    salvarMedia: salvarMediaDoAniList,
    buscarSimilares,
    buscarEntrada: buscarEntradaPorMedia,
    buscarFonte: buscarFonteAtiva,
    buscarAvaliacao,
    listarReviews: listarReviewsDaObra,
    contarNotas: contarNotasPorValor,
    listarAberturas,
  });
}
