/**
 * DELETE /api/v1/listas/:id — apagar a PRÓPRIA lista. Alheia ou inexistente
 * respondem igual: 404.
 * PATCH  /api/v1/listas/:id — editar nome/descrição da PRÓPRIA lista (#51).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  apagarListaDoSistema,
  editarListaDoSistema,
} from "@/server/services/lista.service";
import { usuarioDaSessao } from "../../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA_EDICAO = z.object({
  nome: z.string().max(200),
  descricao: z.string().max(2000).nullable().optional(),
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

  const analise = ESQUEMA_EDICAO.safeParse(corpo);

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
    const resultado = await editarListaDoSistema({
      userId,
      listaId: id,
      nome: analise.data.nome,
      descricao: analise.data.descricao ?? null,
    });

    if (resultado.estado === "lista_invalida")
    {
      return NextResponse.json(
        { erros: { nome: "de 1 a 100 caracteres" } },
        { status: 422 },
      );
    }

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: "lista não encontrada" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[listas] falha ao editar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível agora" } },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
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

  const { id } = await contexto.params;

  try
  {
    const resultado = await apagarListaDoSistema({ userId, listaId: id });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: "lista não encontrada" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[listas] falha ao apagar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível agora" } },
      { status: 500 },
    );
  }
}
