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
import { lerJson } from "../../_shared/corpo";
import { ERRO } from "../../_shared/erros";
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
      { erros: { _geral: ERRO.SESSAO_NECESSARIA } },
      { status: 401 },
    );
  }

  const leitura = await lerJson(request);

  if (!leitura.ok)
  {
    return leitura.resposta;
  }

  const corpo: unknown = leitura.corpo;

  const analise = ESQUEMA_EDICAO.safeParse(corpo);

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
    const resultado = await editarListaDoSistema({
      userId,
      listaId: id,
      nome: analise.data.nome,
      descricao: analise.data.descricao ?? null,
    });

    if (resultado.estado === "lista_invalida")
    {
      return NextResponse.json(
        { erros: { nome: ERRO.NOME_INVALIDO } },
        { status: 422 },
      );
    }

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LISTA_NAO_ENCONTRADA } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[listas] falha ao editar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
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
      { erros: { _geral: ERRO.SESSAO_NECESSARIA } },
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
        { erros: { _geral: ERRO.LISTA_NAO_ENCONTRADA } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[listas] falha ao apagar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
