/**
 * PUT /api/v1/listas/:id/ordem — a ordem INTEIRA dos itens da PRÓPRIA lista
 * (issue #51). Proposta que não é permutação exata dos itens atuais: 422.
 * Acima do teto por usuário (#146): 429 com Retry-After.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { reordenarItensDoSistema } from "@/server/services/lista.service";
import { lerJson } from "../../../_shared/corpo";
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

  const { id } = await contexto.params;

  try
  {
    const resultado = await reordenarItensDoSistema({
      userId,
      listaId: id,
      anilistIds: analise.data.anilistIds,
    });

    if (resultado.estado === "muitos_pedidos")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LIMITE_EXCEDIDO } },
        { status: 429, headers: { "Retry-After": String(resultado.esperarSegundos) } },
      );
    }

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
