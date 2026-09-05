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
      { erros: { _geral: "entre para usar listas" } },
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

  const analise = ESQUEMA.safeParse(corpo);

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
    const resultado = await alternarObraNaListaDoSistema({
      userId,
      listaId: id,
      anilistId: analise.data.anilistId,
    });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: "lista não encontrada" } },
        { status: 404 },
      );
    }

    if (resultado.estado === "obra_desconhecida")
    {
      return NextResponse.json(
        { erros: { _geral: "obra não encontrada" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ contem: resultado.contem }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[listas] falha no toggle:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível agora" } },
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
      { erros: { _geral: "entre para usar listas" } },
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

  const analise = ESQUEMA.safeParse(corpo);

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
    const resultado = await removerObraDaListaDoSistema({
      userId,
      listaId: id,
      anilistId: analise.data.anilistId,
    });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: "lista ou obra não encontrada" } },
        { status: 404 },
      );
    }

    if (resultado.estado === "obra_desconhecida")
    {
      return NextResponse.json(
        { erros: { _geral: "obra não encontrada" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ removido: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[listas] falha ao remover:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível agora" } },
      { status: 500 },
    );
  }
}
