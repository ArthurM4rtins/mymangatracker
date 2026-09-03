/**
 * Caso de uso: avaliar uma obra — nota e/ou resenha, estilo Letterboxd.
 * Uma avaliação por obra, editável; vazia não existe. Desde a issue #45 NÃO
 * exige a obra na estante: vale ter a obra no cache (a página dela cacheia).
 */
import { ratingValido } from "@/server/domain/rating";
import { buscarMediaPorAnilistId } from "@/server/repositories/media.repository";
import {
  removerAvaliacao,
  salvarAvaliacao,
} from "@/server/repositories/avaliacao.repository";

export type PedidoDeAvaliacao = {
  userId: string;
  anilistId: number;
  rating: number | null;
  review: string | null;
  containsSpoilers: boolean;
};

export type ResultadoDeAvaliacao =
  | { estado: "ok" }
  | { estado: "obra_desconhecida" }
  | { estado: "avaliacao_invalida" };

export type DependenciasDeAvaliacao = {
  buscarMedia: (anilistId: number) => Promise<{ id: string } | null>;
  salvar: (dados: {
    userId: string;
    mediaId: string;
    rating: number | null;
    review: string | null;
    containsSpoilers: boolean;
  }) => Promise<{ id: string }>;
  remover: (userId: string, mediaId: string) => Promise<{ removida: true } | null>;
};

export async function salvarAvaliacaoDaEntrada(
  pedido: PedidoDeAvaliacao,
  deps: DependenciasDeAvaliacao,
): Promise<ResultadoDeAvaliacao>
{
  const review = pedido.review?.trim() || null;

  if (pedido.rating !== null && !ratingValido(pedido.rating))
  {
    return { estado: "avaliacao_invalida" };
  }

  // Nota e resenha são independentes, mas avaliação vazia não existe — o
  // CHECK do banco repete isso.
  if (pedido.rating === null && review === null)
  {
    return { estado: "avaliacao_invalida" };
  }

  const media = await deps.buscarMedia(pedido.anilistId);

  if (media === null)
  {
    return { estado: "obra_desconhecida" };
  }

  await deps.salvar({
    userId: pedido.userId,
    mediaId: media.id,
    rating: pedido.rating,
    review,
    containsSpoilers: pedido.containsSpoilers,
  });

  return { estado: "ok" };
}

export async function removerAvaliacaoDaEntrada(
  pedido: { userId: string; anilistId: number },
  deps: DependenciasDeAvaliacao,
): Promise<
  | { estado: "ok" }
  | { estado: "nao_encontrada" }
  | { estado: "obra_desconhecida" }
>
{
  const media = await deps.buscarMedia(pedido.anilistId);

  if (media === null)
  {
    return { estado: "obra_desconhecida" };
  }

  const removida = await deps.remover(pedido.userId, media.id);

  return removida === null ? { estado: "nao_encontrada" } : { estado: "ok" };
}

/** A composição de produção. */
export function salvarAvaliacaoDoSistema(
  pedido: PedidoDeAvaliacao,
): Promise<ResultadoDeAvaliacao>
{
  return salvarAvaliacaoDaEntrada(pedido, DEPS_DE_PRODUCAO);
}

/** A composição de produção. */
export function removerAvaliacaoDoSistema(pedido: {
  userId: string;
  anilistId: number;
})
{
  return removerAvaliacaoDaEntrada(pedido, DEPS_DE_PRODUCAO);
}

const DEPS_DE_PRODUCAO: DependenciasDeAvaliacao = {
  buscarMedia: buscarMediaPorAnilistId,
  salvar: salvarAvaliacao,
  remover: removerAvaliacao,
};
