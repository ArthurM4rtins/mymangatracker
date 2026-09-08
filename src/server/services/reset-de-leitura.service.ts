/**
 * Caso de uso: resetar a leitura de uma obra (#172, parte 2).
 *
 * É o desfazer que a extensão não tinha. Apaga o histórico de aberturas da
 * obra E zera o capítulo marcado à mão, numa transação só: o progresso é o
 * MAIOR entre os dois (`progressoAtual`), então apagar um lado sem o outro
 * não corrige nada. Depois a pessoa marca o capítulo certo pelo caminho que
 * já existe (`definirProgresso`).
 *
 * O status da entrada não muda — resetar não é abandonar.
 *
 * Privado do dono: entrada alheia e inexistente são o mesmo `nao_encontrada`,
 * e a transação carrega o `userId` — nenhuma abertura de outro usuário entra.
 */
import { buscarEntradaDoUsuario } from "@/server/repositories/shelf.repository";
import { apagarHistoricoEZerarProgresso } from "@/server/repositories/reading-progress.repository";

export type PedidoDeReset = {
  userId: string;
  entradaId: string;
};

export type ResultadoDoReset =
  | { estado: "ok"; removidas: number }
  | { estado: "nao_encontrada" };

export type DependenciasDoReset = {
  buscarEntrada: (
    userId: string,
    entradaId: string,
  ) => Promise<{ entradaId: string; mediaId: string } | null>;
  apagarHistoricoEZerar: (
    userId: string,
    mediaId: string,
  ) => Promise<{ removidas: number }>;
};

export async function resetarLeitura(
  pedido: PedidoDeReset,
  deps: DependenciasDoReset,
): Promise<ResultadoDoReset>
{
  const entrada = await deps.buscarEntrada(pedido.userId, pedido.entradaId);

  if (entrada === null)
  {
    return { estado: "nao_encontrada" };
  }

  const { removidas } = await deps.apagarHistoricoEZerar(pedido.userId, entrada.mediaId);

  return { estado: "ok", removidas };
}

/** A composição de produção. */
export function resetarLeituraNoSistema(pedido: PedidoDeReset): Promise<ResultadoDoReset>
{
  return resetarLeitura(pedido, {
    buscarEntrada: buscarEntradaDoUsuario,
    apagarHistoricoEZerar: apagarHistoricoEZerarProgresso,
  });
}
