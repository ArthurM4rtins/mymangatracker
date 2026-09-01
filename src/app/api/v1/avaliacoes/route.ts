/**
 * POST /api/v1/avaliacoes — salvar (criar ou editar) a avaliação de uma
 * entrada da estante. Nota e/ou resenha; vazia não existe.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { salvarAvaliacaoDoSistema } from "@/server/services/avaliacao.service";
import { usuarioDaSessao } from "../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  entradaId: z.string().min(1),
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
      { erros: { _geral: "entre para avaliar" } },
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

  try
  {
    const resultado = await salvarAvaliacaoDoSistema({
      userId,
      entradaId: analise.data.entradaId,
      rating: analise.data.rating,
      review: analise.data.review,
      containsSpoilers: analise.data.containsSpoilers,
    });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: "entrada não encontrada" } },
        { status: 404 },
      );
    }

    if (resultado.estado === "avaliacao_invalida")
    {
      return NextResponse.json(
        { erros: { _geral: "avaliação inválida — nota de 0,5 a 5 em meia estrela, ou resenha" } },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[avaliacoes] falha ao salvar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível salvar agora" } },
      { status: 500 },
    );
  }
}
