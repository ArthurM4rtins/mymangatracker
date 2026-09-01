/**
 * PATCH /api/v1/estante/:id — mudar o status de uma entrada da estante.
 *
 * Entrada de outro usuário responde 404, igual à inexistente: a estante é
 * privada e não revelamos que a entrada alheia existe.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { mudarStatusDaEntradaDoSistema } from "@/server/services/estante.service";
import { usuarioDaSessao } from "../../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA_STATUS = z.object({
  status: z.enum(["READING", "COMPLETED", "PLANNED", "PAUSED", "DROPPED"]),
});

export async function PATCH(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json(
      { erros: { _geral: "entre para usar a estante" } },
      { status: 401 },
    );
  }

  let corpo: unknown;
  try
  {
    corpo = await request.json();
  }
  catch
  {
    return NextResponse.json(
      { erros: { _geral: "corpo inválido — esperado JSON" } },
      { status: 400 },
    );
  }

  const analise = ESQUEMA_STATUS.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: "status inválido" } },
      { status: 400 },
    );
  }

  const { id } = await contexto.params;

  try
  {
    const resultado = await mudarStatusDaEntradaDoSistema({
      userId,
      entradaId: id,
      status: analise.data.status,
    });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: "entrada não encontrada" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[estante] falha ao mudar status:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível salvar agora" } },
      { status: 500 },
    );
  }
}
