/**
 * POST   /api/v1/listas/:id/itens — adicionar a obra à lista (idempotente, #237).
 * DELETE /api/v1/listas/:id/itens — remover a obra da lista (nunca adiciona).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adicionarObraNaListaDoSistema,
  removerObraDaListaDoSistema,
} from "@/server/services/lista.service";
import { lerJson } from "../../../_shared/corpo";
import { ERRO } from "../../../_shared/erros";
import { usuarioDaSessao } from "../../../_shared/sessao";
import { referenciaDaChave } from "@/server/domain/referencia-da-obra";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  /** A obra pela chave (#254): `anilist:30002` ou `kitsu:54598`. */
  obra: z.string().min(3).max(40),
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

  const leitura = await lerJson(request);

  if (!leitura.ok)
  {
    return leitura.resposta;
  }

  const corpo: unknown = leitura.corpo;

  const analise = ESQUEMA.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.PEDIDO_INVALIDO } },
      { status: 400 },
    );
  }

  // A chave chega do corpo: nada nela e de confianca (#254).
  const referencia = referenciaDaChave(analise.data.obra);

  if (referencia === null)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.PEDIDO_INVALIDO } },
      { status: 400 },
    );
  }

  const { id } = await contexto.params;

  try
  {
    const resultado = await adicionarObraNaListaDoSistema({
      userId,
      listaId: id,
      referencia,
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

    if (resultado.estado === "lista_cheia")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LISTA_CHEIA } },
        { status: 422 },
      );
    }

    if (resultado.estado === "indisponivel")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.CATALOGO_INDISPONIVEL } },
        { status: 503 },
      );
    }

    if (resultado.estado === "limitado")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LIMITE_EXCEDIDO } },
        { status: 429, headers: { "Retry-After": String(resultado.esperarSegundos) } },
      );
    }

    return NextResponse.json({ contem: resultado.contem }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[listas] falha ao adicionar:", erro instanceof Error ? erro.message : erro);
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

  const leitura = await lerJson(request);

  if (!leitura.ok)
  {
    return leitura.resposta;
  }

  const corpo: unknown = leitura.corpo;

  const analise = ESQUEMA.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.PEDIDO_INVALIDO } },
      { status: 400 },
    );
  }

  // A chave chega do corpo: nada nela e de confianca (#254).
  const referencia = referenciaDaChave(analise.data.obra);

  if (referencia === null)
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
      referencia,
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
