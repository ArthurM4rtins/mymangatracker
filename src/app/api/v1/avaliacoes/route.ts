/**
 * POST /api/v1/avaliacoes — salvar (criar ou editar) a avaliação de uma
 * entrada da estante. Nota e/ou resenha; vazia não existe.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { salvarAvaliacaoDoSistema } from "@/server/services/avaliacao.service";
import { ERRO } from "../_shared/erros";
import { usuarioDaSessao } from "../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  anilistId: z.number().int().positive(),
  rating: z.number().nullable(),
  review: z.string().max(20000).nullable(),
  containsSpoilers: z.boolean().default(false),
});

export async function POST(request: Request)
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

  try
  {
    const resultado = await salvarAvaliacaoDoSistema({
      userId,
      anilistId: analise.data.anilistId,
      rating: analise.data.rating,
      review: analise.data.review,
      containsSpoilers: analise.data.containsSpoilers,
    });

    if (resultado.estado === "obra_desconhecida")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.OBRA_NAO_ENCONTRADA } },
        { status: 404 },
      );
    }

    if (resultado.estado === "avaliacao_invalida")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.AVALIACAO_INVALIDA } },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[avaliacoes] falha ao salvar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
