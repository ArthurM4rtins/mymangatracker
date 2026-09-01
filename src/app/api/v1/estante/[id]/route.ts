/**
 * PATCH /api/v1/estante/:id — mudar o status OU editar o capítulo em leitura.
 *
 * Entrada de outro usuário responde 404, igual à inexistente: a estante é
 * privada e não revelamos que a entrada alheia existe.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  definirProgressoDoSistema,
  mudarStatusDaEntradaDoSistema,
} from "@/server/services/estante.service";
import { usuarioDaSessao } from "../../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA_PATCH = z
  .object({
    status: z.enum(["READING", "COMPLETED", "PLANNED", "PAUSED", "DROPPED"]).optional(),
    // Decimal com até 2 casas — capítulo 57.5 existe. Máximo do Decimal(8,2).
    capitulo: z.number().positive().max(999999.99).optional(),
  })
  .refine(
    function (corpo) { return corpo.status !== undefined || corpo.capitulo !== undefined; },
    { message: "informe status ou capitulo" },
  );

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

  const analise = ESQUEMA_PATCH.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: "pedido inválido" } },
      { status: 400 },
    );
  }

  const { id } = await contexto.params;

  try
  {
    if (analise.data.status !== undefined)
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
    }

    if (analise.data.capitulo !== undefined)
    {
      const resultado = await definirProgressoDoSistema({
        userId,
        entradaId: id,
        capitulo: analise.data.capitulo,
      });

      if (resultado.estado === "nao_encontrada")
      {
        return NextResponse.json(
          { erros: { _geral: "entrada não encontrada" } },
          { status: 404 },
        );
      }

      if (resultado.estado === "capitulo_invalido")
      {
        return NextResponse.json(
          { erros: { _geral: "capítulo inválido" } },
          { status: 422 },
        );
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[estante] falha ao atualizar entrada:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível salvar agora" } },
      { status: 500 },
    );
  }
}
