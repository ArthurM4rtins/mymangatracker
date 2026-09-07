/**
 * POST   /api/v1/listas/:id/itens — alternar a obra na lista (entra/sai).
 * DELETE /api/v1/listas/:id/itens — remover a obra da lista (nunca adiciona).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  alternarObraNaListaDoSistema,
  removerObraDaListaDoSistema,
} from "@/server/services/lista.service";
import { ERRO } from "../../../_shared/erros";
import { usuarioDaSessao } from "../../../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  anilistId: z.number().int().positive(),
});

export async function POST(
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
    const resultado = await alternarObraNaListaDoSistema({
      userId,
      listaId: id,
      anilistId: analise.data.anilistId,
    });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LISTA_NAO_ENCONTRADA } },
        { status: 404 },
      );
    }

    if (resultado.estado === "obra_desconhecida")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.OBRA_NAO_ENCONTRADA } },
        { status: 404 },
      );
    }

    return NextResponse.json({ contem: resultado.contem }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[listas] falha no toggle:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
    const resultado = await removerObraDaListaDoSistema({
      userId,
      listaId: id,
      anilistId: analise.data.anilistId,
    });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LISTA_OU_OBRA_NAO_ENCONTRADA } },
        { status: 404 },
      );
    }

    if (resultado.estado === "obra_desconhecida")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.OBRA_NAO_ENCONTRADA } },
        { status: 404 },
      );
    }

    return NextResponse.json({ removido: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[listas] falha ao remover:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
