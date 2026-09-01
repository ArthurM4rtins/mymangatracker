/**
 * Caso de uso: avaliar uma obra da estante — nota e/ou resenha, estilo
 * Letterboxd. Uma avaliação por obra, editável; vazia não existe.
 */
import { ratingValido } from "@/server/domain/rating";
import { buscarEntradaDoUsuario } from "@/server/repositories/shelf.repository";
import {
  removerAvaliacao,
  salvarAvaliacao,
} from "@/server/repositories/avaliacao.repository";

export type PedidoDeAvaliacao = {
  userId: string;
  entradaId: string;
  rating: number | null;
  review: string | null;
  containsSpoilers: boolean;
};

export type ResultadoDeAvaliacao =
  | { estado: "ok" }
  | { estado: "nao_encontrada" }
  | { estado: "avaliacao_invalida" };

export type DependenciasDeAvaliacao = {
  buscarEntrada: (
    userId: string,
    entradaId: string,
  ) => Promise<{ entradaId: string; mediaId: string; progressChapter: string | null } | null>;
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

  const entrada = await deps.buscarEntrada(pedido.userId, pedido.entradaId);

  if (entrada === null)
  {
    return { estado: "nao_encontrada" };
  }

  await deps.salvar({
    userId: pedido.userId,
    mediaId: entrada.mediaId,
    rating: pedido.rating,
    review,
    containsSpoilers: pedido.containsSpoilers,
  });

  return { estado: "ok" };
}

export async function removerAvaliacaoDaEntrada(
  pedido: { userId: string; entradaId: string },
  deps: DependenciasDeAvaliacao,
): Promise<{ estado: "ok" } | { estado: "nao_encontrada" }>
{
  const entrada = await deps.buscarEntrada(pedido.userId, pedido.entradaId);

  if (entrada === null)
  {
    return { estado: "nao_encontrada" };
  }

  const removida = await deps.remover(pedido.userId, entrada.mediaId);

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
  entradaId: string;
}): Promise<{ estado: "ok" } | { estado: "nao_encontrada" }>
{
  return removerAvaliacaoDaEntrada(pedido, DEPS_DE_PRODUCAO);
}

const DEPS_DE_PRODUCAO: DependenciasDeAvaliacao = {
  buscarEntrada: buscarEntradaDoUsuario,
  salvar: salvarAvaliacao,
  remover: removerAvaliacao,
};
