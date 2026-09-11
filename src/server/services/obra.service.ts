import { chaveDaObra, referenciaDeMedia, type ReferenciaDaObra } from "@/server/domain/referencia-da-obra";
import { referenciaDaObra } from "@/server/domain/anilist-media";
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
import type { AutorDaObra, MediaDoAniList } from "@/server/domain/anilist-media";
import { buscarSimilares } from "@/server/infra/anilist";
import { lembrarPorChave } from "@/server/domain/memoria-curta";
import { buscarObraNaFonte, type ResultadoDaFonte } from "@/server/services/obra-externa.service";
import {
  buscarMediaCompletaPorReferencia,
  salvarMediaDoAniList,
  type MediaCompleta,
} from "@/server/repositories/media.repository";
import { buscarEntradaPorMedia } from "@/server/repositories/shelf.repository";
import {
  listarAberturas,
  aberturaMaisAvancadaDaObra,
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
  chave: string;
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
  /** A obra pela chave (#254): similar sem AniList também tem para onde levar. */
  chave: string;
  titleRomaji: string;
  titleEnglish: string | null;
  coverImageUrl: string | null;
};

export type MinhaRelacao = {
  entradaId: string;
  status: "READING" | "COMPLETED" | "PLANNED" | "PAUSED" | "DROPPED";
  progressChapter: string | null;
  /** Para onde o "Continuar leitura" leva: a abertura mais avançada (#170). */
  continuarEm: { url: string; host: string; capitulo: string } | null;
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
      notaDoFolunio: ResumoDeNotas | null;
    }
  | { estado: "nao_encontrada" }
  | { estado: "indisponivel" };

export type DependenciasDaObra = {
  buscarCompleta: (referencia: ReferenciaDaObra) => Promise<MediaCompleta | null>;
  /** A escada de fontes, uma só para as três telas que a usavam (#254). */
  buscarNaFonte: (referencia: ReferenciaDaObra) => Promise<ResultadoDaFonte>;
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
  buscarLeituraMaisAvancada: (
    userId: string,
    mediaId: string,
  ) => Promise<{ resolvedUrl: string; chapter: string } | null>;
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
    limite: number,
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
/** Quantas resenhas a página carrega (#135): as mais curtidas; o resto fica no banco. */
const REVIEWS_NA_OBRA = 20;

export async function obraParaPagina(
  referencia: ReferenciaDaObra,
  userId: string | null,
  deps: DependenciasDaObra,
): Promise<ResultadoDaObra>
{
  const agora = deps.relogio?.() ?? new Date();

  let cache: MediaCompleta | null;

  try
  {
    cache = await deps.buscarCompleta(referencia);
  }
  catch
  {
    // Banco fora (primeiro deploy sem Neon, ou Neon caído): degrada como as
    // outras páginas, em vez de ser a única que estoura (#63).
    return { estado: "indisponivel" };
  }

  // Se o AniList cair aqui, não pagar outro timeout em série nos similares (#65, item 3).
  let fonteFora = false;

  if (cache === null || !cacheEstaFresco(cache.syncedAt, agora))
  {
    const resposta = await deps.buscarNaFonte(referencia);

    if (resposta.estado === "indisponivel")
    {
      // Ninguém respondeu. Página é leitura: cache velho serve; sem cache, não
      // há página.
      if (cache === null)
      {
        return { estado: "indisponivel" };
      }

      fonteFora = true;
    }
    else if (resposta.obra === null)
    {
      // Quem respondeu decide o peso do "não existe". A fonte DONA da
      // referência dizendo que não tem a obra é definitivo: cache antigo de
      // algo que sumiu não ressuscita a página. Já o Kitsu, respondendo no
      // lugar do AniList caído, não prova nada — ele tem bem menos obras —,
      // então com cache na mão a página serve o cache em vez de virar 404.
      if (resposta.respondeu === referencia.fonte || cache === null)
      {
        return { estado: "nao_encontrada" };
      }

      fonteFora = true;
    }
    else
    {
      const daFonte = resposta.obra;
      const salvo = await deps.salvarMedia(daFonte, agora);

      cache = {
        id: salvo.id,
        anilistId: daFonte.anilistId ?? null,
        kitsuId: daFonte.kitsuId ?? null,
        type: daFonte.type,
        countryOfOrigin: daFonte.countryOfOrigin ?? null,
        titleRomaji: daFonte.titleRomaji,
        titleEnglish: daFonte.titleEnglish ?? null,
        titleNative: daFonte.titleNative ?? null,
        coverImageUrl: daFonte.coverImageUrl ?? null,
        bannerImageUrl: daFonte.bannerImageUrl ?? null,
        description: daFonte.description ?? null,
        chapters: daFonte.chapters ?? null,
        startYear: daFonte.startYear ?? null,
        genres: daFonte.genres ?? [],
        averageScore: daFonte.averageScore ?? null,
        autores: daFonte.autores ?? [],
        syncedAt: salvo.syncedAt,
      };
    }
  }

  if (cache === null)
  {
    // Inalcançável: todo caminho acima ou preenche o cache ou já retornou. O
    // compilador não enxerga isso, e mentir com `!` seria pior.
    return { estado: "indisponivel" };
  }

  const [similares, minha, minhaAvaliacao, reviews, contagens] = await Promise.all([
    // Similares só existem no AniList: obra que nasceu no Kitsu não tem de
    // onde tirá-los, e a página vive bem sem a fileira (#254).
    fonteFora || cache.anilistId === null
      ? Promise.resolve([])
      : similaresSemDerrubar(cache.anilistId, deps),
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
    deps.listarReviews(cache.id, userId, REVIEWS_NA_OBRA).catch(function () { return []; }),
    // Agregado falhando não derruba a obra — a nota some.
    deps.contarNotas(cache.id).catch(function (): ContagemDeNota[] { return []; }),
  ]);

  const obra: ObraDaPagina = {
    chave: chaveDaObra(referenciaDeMedia({ anilistId: cache.anilistId, kitsuId: cache.kitsuId }) ?? { fonte: "anilist", id: 0 }),
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
    notaDoFolunio: resumirNotas(contagens),
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
        chave: chaveDaObra(referenciaDaObra(obra)),
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

  const [ultima, historico] = await Promise.all([
    deps.buscarLeituraMaisAvancada(userId, mediaId),
    // Histórico falhando não derruba o painel — a lista some.
    deps
      .listarAberturas(userId, mediaId, LIMITE_DO_HISTORICO)
      .catch(function (): AberturaDoHistorico[] { return []; }),
  ]);

  return {
    entradaId: entrada.entradaId,
    status: entrada.status,
    progressChapter: entrada.progressChapter,
    historico,
    // O host sai da propria URL: uma verdade so, a que a extensao atualiza.
    continuarEm:
      ultima === null
        ? null
        : {
            url: ultima.resolvedUrl,
            host: new URL(ultima.resolvedUrl).host,
            capitulo: ultima.chapter,
          },
  };
}

/**
 * Similares muda devagar e o id vem da URL: caminhar por ids era uma requisição
 * nova ao AniList por id, sem teto, do IP único do deploy (#134). Cinco minutos
 * por id, com teto de chaves para o mapa não crescer sem limite.
 *
 * No escopo do módulo, não dentro da composição: recriado a cada chamada, o memo
 * não lembraria nada.
 */
const JANELA_DOS_SIMILARES_MS = 5 * 60_000;
const MAXIMO_DE_IDS = 200;

const similaresLembrados = lembrarPorChave(
  buscarSimilares,
  JANELA_DOS_SIMILARES_MS,
  MAXIMO_DE_IDS,
);

/** A composição de produção. */
export function obraParaPaginaDoSistema(
  referencia: ReferenciaDaObra,
  userId: string | null,
): Promise<ResultadoDaObra>
{
  return obraParaPagina(referencia, userId, {
    buscarCompleta: buscarMediaCompletaPorReferencia,
    buscarNaFonte: buscarObraNaFonte,
    salvarMedia: salvarMediaDoAniList,
    buscarSimilares: similaresLembrados,
    buscarEntrada: buscarEntradaPorMedia,
    buscarLeituraMaisAvancada: aberturaMaisAvancadaDaObra,
    buscarAvaliacao,
    listarReviews: listarReviewsDaObra,
    contarNotas: contarNotasPorValor,
    listarAberturas,
  });
}
