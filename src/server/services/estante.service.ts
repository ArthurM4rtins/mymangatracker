/**
 * Caso de uso: adicionar uma obra à estante.
 *
 * O que vem da tela é só o `anilistId` — os dados da obra saem do cache em
 * `Media` (TTL de 24h) ou do AniList via infra. Nunca do corpo da requisição:
 * cache alimentado pelo cliente seria dado forjável.
 */
import { cacheEstaFresco } from "@/server/domain/media-cache";
import { proximoCapitulo, tipoDaFonte } from "@/server/domain/progresso";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { buscarMediaPorId } from "@/server/infra/anilist";
import {
  buscarMediaPorAnilistId,
  salvarMediaDoAniList,
} from "@/server/repositories/media.repository";
import {
  adicionarOuAtualizarEntrada,
  atualizarStatusDaEntrada,
  listarAnilistIdsDaEstante,
  listarEntradasDoUsuario,
} from "@/server/repositories/shelf.repository";
import { listarFontesAtivas } from "@/server/repositories/reading-source.repository";

export type StatusDaEstante =
  | "READING"
  | "COMPLETED"
  | "PLANNED"
  | "PAUSED"
  | "DROPPED";

export type PedidoDeEstante = {
  userId: string;
  anilistId: number;
  status: StatusDaEstante;
};

export type ResultadoDaEstante =
  | { estado: "ok"; entradaId: string }
  | { estado: "obra_desconhecida" }
  | { estado: "indisponivel" };

export type DependenciasDaEstante = {
  buscarMediaNoBanco: (
    anilistId: number,
  ) => Promise<{ id: string; syncedAt: Date } | null>;
  salvarMedia: (
    obra: MediaDoAniList,
    sincronizadoEm: Date,
  ) => Promise<{ id: string; syncedAt: Date }>;
  buscarNoAniList: (anilistId: number) => Promise<MediaDoAniList | null>;
  gravarEntrada: (dados: {
    userId: string;
    mediaId: string;
    status: StatusDaEstante;
  }) => Promise<{ id: string }>;
  relogio?: () => Date;
};

export async function adicionarNaEstante(
  pedido: PedidoDeEstante,
  deps: DependenciasDaEstante,
): Promise<ResultadoDaEstante>
{
  const agora = deps.relogio?.() ?? new Date();

  const emCache = await deps.buscarMediaNoBanco(pedido.anilistId);

  let mediaId: string;

  if (emCache && cacheEstaFresco(emCache.syncedAt, agora))
  {
    mediaId = emCache.id;
  }
  else
  {
    let obra: MediaDoAniList | null;
    try
    {
      obra = await deps.buscarNoAniList(pedido.anilistId);
    }
    catch
    {
      // AniList fora. Mesmo com cache velho não gravamos entrada: a obra pode
      // ter mudado de formato e sido descartada — melhor pedir para tentar depois.
      return { estado: "indisponivel" };
    }

    if (obra === null)
    {
      // O domínio descartou (formato fora do enum, sem título). Não vira linha.
      return { estado: "obra_desconhecida" };
    }

    const salvo = await deps.salvarMedia(obra, agora);
    mediaId = salvo.id;
  }

  const entrada = await deps.gravarEntrada({
    userId: pedido.userId,
    mediaId,
    status: pedido.status,
  });

  return { estado: "ok", entradaId: entrada.id };
}

/** O que a tela da estante recebe por entrada. Contrato, não entidade do Prisma. */
export type EntradaDaEstante = {
  entradaId: string;
  status: StatusDaEstante;
  progressChapter: string | null;
  obra: {
    titleRomaji: string;
    titleEnglish: string | null;
    coverImageUrl: string | null;
    type: "MANGA" | "NOVEL";
    countryOfOrigin: string | null;
    chapters: number | null;
  };
  /** A fonte de leitura ativa — só o que a tela mostra, nunca o template. */
  fonte: { sourceHost: string; tipo: "template" | "pagina" } | null;
  proximoCapitulo: number;
};

export type FiltroDaEstante = {
  userId: string;
  status?: StatusDaEstante;
};

type EntradaNoRepositorio = Omit<EntradaDaEstante, "fonte" | "proximoCapitulo"> & {
  mediaId: string;
};

export type DependenciasDeListagem = {
  listarEntradas: (
    userId: string,
    status?: StatusDaEstante,
  ) => Promise<EntradaNoRepositorio[]>;
  listarFontes: (
    userId: string,
  ) => Promise<Array<{ mediaId: string; sourceHost: string; urlTemplate: string }>>;
};

/**
 * A estante é privada do dono: o userId vem da sessão resolvida no controller
 * e é obrigatório aqui por tipo — não existe caminho de listar sem ele.
 *
 * O DTO compõe a fonte ativa e o próximo capítulo; o mediaId interno não sai.
 */
export async function listarEstante(
  filtro: FiltroDaEstante,
  deps: DependenciasDeListagem,
): Promise<EntradaDaEstante[]>
{
  const [entradas, fontes] = await Promise.all([
    deps.listarEntradas(filtro.userId, filtro.status),
    deps.listarFontes(filtro.userId),
  ]);

  const fontePorMedia = new Map(
    fontes.map(function (fonte) { return [fonte.mediaId, fonte] as const; }),
  );

  return entradas.map(function (entrada)
  {
    const fonte = fontePorMedia.get(entrada.mediaId) ?? null;
    const maior =
      entrada.progressChapter === null ? null : Number(entrada.progressChapter);

    return {
      entradaId: entrada.entradaId,
      status: entrada.status,
      progressChapter: entrada.progressChapter,
      obra: entrada.obra,
      fonte:
        fonte === null
          ? null
          : { sourceHost: fonte.sourceHost, tipo: tipoDaFonte(fonte.urlTemplate) },
      proximoCapitulo: proximoCapitulo(maior),
    };
  });
}

export type DependenciasDeMarcacao = {
  listarAnilistIds: (userId: string) => Promise<number[]>;
};

/** O que da estante já existe, por anilistId — para o catálogo marcar os cards. */
export function anilistIdsNaEstante(
  userId: string,
  deps: DependenciasDeMarcacao,
): Promise<number[]>
{
  return deps.listarAnilistIds(userId);
}

/** A composição de produção. */
export function anilistIdsNaEstanteDoSistema(userId: string): Promise<number[]>
{
  return anilistIdsNaEstante(userId, {
    listarAnilistIds: listarAnilistIdsDaEstante,
  });
}

export type PedidoDeStatus = {
  userId: string;
  entradaId: string;
  status: StatusDaEstante;
};

export type ResultadoDeStatus = { estado: "ok" } | { estado: "nao_encontrada" };

export type DependenciasDeStatus = {
  atualizarStatus: (
    userId: string,
    entradaId: string,
    status: StatusDaEstante,
  ) => Promise<{ id: string } | null>;
};

/**
 * Entrada de outro usuário e entrada inexistente respondem igual
 * (`nao_encontrada`): não revelamos que a entrada alheia existe.
 */
export async function mudarStatusDaEntrada(
  pedido: PedidoDeStatus,
  deps: DependenciasDeStatus,
): Promise<ResultadoDeStatus>
{
  const atualizada = await deps.atualizarStatus(
    pedido.userId,
    pedido.entradaId,
    pedido.status,
  );

  return atualizada === null ? { estado: "nao_encontrada" } : { estado: "ok" };
}

/** A composição de produção. */
export function listarEstanteDoSistema(
  filtro: FiltroDaEstante,
): Promise<EntradaDaEstante[]>
{
  return listarEstante(filtro, {
    listarEntradas: listarEntradasDoUsuario,
    listarFontes: listarFontesAtivas,
  });
}

/** A composição de produção. */
export function mudarStatusDaEntradaDoSistema(
  pedido: PedidoDeStatus,
): Promise<ResultadoDeStatus>
{
  return mudarStatusDaEntrada(pedido, {
    atualizarStatus: atualizarStatusDaEntrada,
  });
}

/** A composição de produção. */
export function adicionarNaEstanteDoSistema(
  pedido: PedidoDeEstante,
): Promise<ResultadoDaEstante>
{
  return adicionarNaEstante(pedido, {
    buscarMediaNoBanco: buscarMediaPorAnilistId,
    salvarMedia: salvarMediaDoAniList,
    buscarNoAniList: buscarMediaPorId,
    gravarEntrada: adicionarOuAtualizarEntrada,
  });
}
