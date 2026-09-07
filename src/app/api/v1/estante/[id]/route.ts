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
import { ERRO } from "../../_shared/erros";
import { usuarioDaSessao } from "../../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA_PATCH = z
  .object({
    status: z.enum(["READING", "COMPLETED", "PLANNED", "PAUSED", "DROPPED"]).optional(),
    // Decimal com até 2 casas — capítulo 57.5 existe. Máximo do Decimal(8,2).
    // Decimal(8,2): duas casas, senão o banco arredonda o que a resposta afirmou.
    capitulo: z.number().positive().max(999999.99).multipleOf(0.01).optional(),
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
      { erros: { _geral: ERRO.SESSAO_NECESSARIA } },
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
      { erros: { _geral: ERRO.CORPO_INVALIDO } },
      { status: 400 },
    );
  }

  const analise = ESQUEMA_PATCH.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.PEDIDO_INVALIDO } },
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
          { erros: { _geral: ERRO.ENTRADA_NAO_ENCONTRADA } },
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
          { erros: { _geral: ERRO.ENTRADA_NAO_ENCONTRADA } },
          { status: 404 },
        );
      }

      if (resultado.estado === "capitulo_invalido")
      {
        return NextResponse.json(
          { erros: { _geral: ERRO.CAPITULO_INVALIDO } },
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
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
