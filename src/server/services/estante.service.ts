/**
 * Caso de uso: adicionar uma obra à estante.
 *
 * O que vem da tela é só o `anilistId` — os dados da obra saem do cache em
 * `Media` (TTL de 24h) ou do AniList via infra. Nunca do corpo da requisição:
 * cache alimentado pelo cliente seria dado forjável.
 */
import { cacheEstaFresco } from "@/server/domain/media-cache";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { buscarMediaPorId } from "@/server/infra/anilist";
import {
  buscarMediaPorAnilistId,
  salvarMediaDoAniList,
} from "@/server/repositories/media.repository";
import { adicionarOuAtualizarEntrada } from "@/server/repositories/shelf.repository";

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
