/**
 * Casos de uso do social das resenhas (issue #39): curtir (toggle), comentar
 * e apagar o próprio comentário. Quem resolve a sessão é o controller.
 */
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import { limitarComentario } from "./limite.service";
import {
  alternarCurtida,
  apagarComentario,
  comentarNaReview,
  listarComentariosAnteriores,
  type ComentarioDaReview,
} from "@/server/repositories/review-social.repository";

const TAMANHO_MAXIMO_DO_COMENTARIO = 2000;

export type DependenciasDeCurtida = {
  alternar: (
    entryId: string,
    userId: string,
  ) => Promise<{ curtida: boolean; total: number } | null>;
};

export async function curtirReview(
  pedido: { userId: string; entryId: string },
  deps: DependenciasDeCurtida,
): Promise<
  | { estado: "ok"; curtida: boolean; total: number }
  | { estado: "nao_encontrada" }
>
{
  const resultado = await deps.alternar(pedido.entryId, pedido.userId);

  if (resultado === null)
  {
    return { estado: "nao_encontrada" };
  }

  return { estado: "ok", curtida: resultado.curtida, total: resultado.total };
}

export type DependenciasDeComentario = {
  comentar: (
    entryId: string,
    userId: string,
    texto: string,
  ) => Promise<{ id: string } | null>;
  /** Teto de comentários por usuário na janela (#109). */
  limitar: (userId: string) => Promise<Veredito>;
};

export async function comentarReview(
  pedido: { userId: string; entryId: string; texto: string },
  deps: DependenciasDeComentario,
): Promise<
  | { estado: "ok" }
  | { estado: "nao_encontrada" }
  | { estado: "comentario_invalido" }
  | { estado: "muitos_comentarios"; esperarSegundos: number }
>
{
  const texto = pedido.texto.trim();

  if (texto === "" || texto.length > TAMANHO_MAXIMO_DO_COMENTARIO)
  {
    return { estado: "comentario_invalido" };
  }

  const limite = await deps.limitar(pedido.userId);

  if (limite.bloqueado)
  {
    return { estado: "muitos_comentarios", esperarSegundos: limite.esperarSegundos };
  }

  const criado = await deps.comentar(pedido.entryId, pedido.userId, texto);

  return criado === null ? { estado: "nao_encontrada" } : { estado: "ok" };
}

export type DependenciasDePaginacao = {
  listar: (
    entryId: string,
    antesDe: Date,
    userId: string | null,
  ) => Promise<ComentarioDaReview[]>;
};

/** A página anterior da conversa de uma resenha (#109). */
export function comentariosAnterioresDaReview(
  pedido: { entryId: string; antesDe: Date; userId: string | null },
  deps: DependenciasDePaginacao,
): Promise<ComentarioDaReview[]>
{
  return deps.listar(pedido.entryId, pedido.antesDe, pedido.userId);
}

/** A composição de produção. */
export function comentariosAnterioresDaReviewDoSistema(pedido: {
  entryId: string;
  antesDe: Date;
  userId: string | null;
}): Promise<ComentarioDaReview[]>
{
  return comentariosAnterioresDaReview(pedido, { listar: listarComentariosAnteriores });
}

export type DependenciasDeRemocao = {
  apagar: (
    userId: string,
    comentarioId: string,
  ) => Promise<{ removido: true } | null>;
};

export async function apagarComentarioDaReview(
  pedido: { userId: string; comentarioId: string },
  deps: DependenciasDeRemocao,
): Promise<{ estado: "ok" } | { estado: "nao_encontrada" }>
{
  const removido = await deps.apagar(pedido.userId, pedido.comentarioId);

  return removido === null ? { estado: "nao_encontrada" } : { estado: "ok" };
}

/** A composição de produção. */
export function curtirReviewDoSistema(pedido: { userId: string; entryId: string })
{
  return curtirReview(pedido, { alternar: alternarCurtida });
}

/** A composição de produção. */
export function comentarReviewDoSistema(pedido: {
  userId: string;
  entryId: string;
  texto: string;
})
{
  return comentarReview(pedido, {
    comentar: comentarNaReview,
    limitar: function (userId) { return limitarComentario({ userId }); },
  });
}

/** A composição de produção. */
export function apagarComentarioDoSistema(pedido: {
  userId: string;
  comentarioId: string;
})
{
  return apagarComentarioDaReview(pedido, { apagar: apagarComentario });
}
