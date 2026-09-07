/**
 * PUT /api/v1/listas/:id/ordem — a ordem INTEIRA dos itens da PRÓPRIA lista
 * (issue #51). Proposta que não é permutação exata dos itens atuais: 422.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { reordenarItensDoSistema } from "@/server/services/lista.service";
import { ERRO } from "../../../_shared/erros";
import { usuarioDaSessao } from "../../../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  anilistIds: z.array(z.number().int().positive()).max(500),
});

export async function PUT(
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

  const analise = ESQUEMA.safeParse(corpo);

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
    const resultado = await reordenarItensDoSistema({
      userId,
      listaId: id,
      anilistIds: analise.data.anilistIds,
    });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LISTA_NAO_ENCONTRADA } },
        { status: 404 },
      );
    }

    if (resultado.estado === "ordem_invalida")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.ORDEM_INVALIDA } },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[listas] falha ao reordenar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
