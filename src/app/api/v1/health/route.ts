/**
 * GET /api/v1/health
 *
 * Controller: nao contem regra. Delega ao servico, traduz o estado em status HTTP
 * e serializa. O corpo e o DTO do contrato, nao entidade de banco.
 */
import { NextResponse } from "next/server";
import { httpStatusPara } from "@/server/domain/health-status";
import { verificarSaudeDoSistema } from "@/server/services/sistema.service";
import { usuarioDaSessao } from "../_shared/sessao";

// Health é medição do agora: nunca pré-renderizado, nunca servido de cache.
export const dynamic = "force-dynamic";

export async function GET()
{
  // Sem sessão o corpo é só o estado geral (#148, item 12): a lista de
  // dependências anuncia, por exemplo, a janela em que o segredo de sessão não
  // está configurado e nenhum login funciona. Nada de credencial vazava, mas
  // também não há motivo para publicar isso a qualquer um.
  const autenticado = (await usuarioDaSessao()) !== null;
  const relatorio = await verificarSaudeDoSistema({ completo: autenticado });

  const corpo = autenticado
    ? relatorio
    : { status: relatorio.status, checkedAt: relatorio.checkedAt };

  return NextResponse.json(corpo, {
    status: httpStatusPara(relatorio.status),
    headers: { "Cache-Control": "no-store" },
  });
}
