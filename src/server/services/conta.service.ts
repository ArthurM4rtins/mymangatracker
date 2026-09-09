/**
 * Caso de uso: apagar a própria conta (issue #208).
 *
 * O `onDelete: Cascade` do schema faz o resto — estante, listas, itens e
 * curtidas de lista, avaliações, curtidas e comentários de resenha, progresso,
 * fontes, e quem a pessoa seguia. Some junto o comentário que OUTRAS pessoas
 * escreveram nas resenhas dela: decisão registrada na issue em 09/09/2026.
 *
 * A sessão morre sozinha. A validação do token recusa quando não acha a versão
 * do usuário (`sessao.service.ts`), e usuário apagado não tem versão — nenhum
 * passo extra é preciso para derrubar o JWT antigo.
 */
import { confirmacaoConfere } from "@/server/domain/exclusao-de-conta";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import { apagarUsuario, buscarUsuarioPorId } from "@/server/repositories/usuario.repository";
import { limitarConta } from "./limite.service";

export type ResultadoDaExclusao =
  | { estado: "ok" }
  | { estado: "confirmacao_invalida" }
  | { estado: "nao_encontrada" }
  | { estado: "muitos_pedidos"; esperarSegundos: number };

export type DependenciasDaConta = {
  buscarUsuario: (userId: string) => Promise<{ username: string } | null>;
  limitar: (userId: string) => Promise<Veredito>;
  apagar: (userId: string) => Promise<void>;
};

export async function apagarConta(
  pedido: { userId: string; confirmacao: string },
  deps: DependenciasDaConta,
): Promise<ResultadoDaExclusao>
{
  const limite = await deps.limitar(pedido.userId);

  if (limite.bloqueado)
  {
    return { estado: "muitos_pedidos", esperarSegundos: limite.esperarSegundos };
  }

  const usuario = await deps.buscarUsuario(pedido.userId);

  if (usuario === null)
  {
    return { estado: "nao_encontrada" };
  }

  // A confirmação é comparada com o username do BANCO, nunca com um que venha
  // no pedido: senão o cliente escolheria os dois lados da comparação, e a
  // confirmação deixaria de confirmar qualquer coisa.
  if (!confirmacaoConfere(pedido.confirmacao, usuario.username))
  {
    return { estado: "confirmacao_invalida" };
  }

  await deps.apagar(pedido.userId);

  return { estado: "ok" };
}

/** A composição de produção. */
export function apagarContaDoSistema(pedido: {
  userId: string;
  confirmacao: string;
}): Promise<ResultadoDaExclusao>
{
  return apagarConta(pedido, {
    buscarUsuario: buscarUsuarioPorId,
    limitar: function (userId) { return limitarConta({ userId }); },
    apagar: apagarUsuario,
  });
}
