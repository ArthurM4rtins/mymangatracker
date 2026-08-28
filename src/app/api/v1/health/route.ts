/**
 * GET /api/v1/health
 *
 * Controller: nao contem regra. Delega ao servico, traduz o estado em status HTTP
 * e serializa. O corpo e o DTO do contrato, nao entidade de banco.
 */
import { NextResponse } from "next/server";
import { httpStatusPara } from "@/server/domain/health-status";
import { verificarSaudeDoSistema } from "@/server/services/sistema.service";

// Health é medição do agora: nunca pré-renderizado, nunca servido de cache.
export const dynamic = "force-dynamic";

export async function GET()
{
  const relatorio = await verificarSaudeDoSistema();

  return NextResponse.json(relatorio, {
    status: httpStatusPara(relatorio.status),
    headers: { "Cache-Control": "no-store" },
  });
}
