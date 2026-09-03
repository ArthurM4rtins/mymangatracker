/**
 * POST /api/v1/reviews/:entryId/comentarios — comentar na resenha.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { comentarReviewDoSistema } from "@/server/services/review-social.service";
import { usuarioDaSessao } from "../../../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  texto: z.string().min(1).max(2000),
});

export async function POST(
  request: Request,
  contexto: { params: Promise<{ entryId: string }> },
)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json(
      { erros: { _geral: "entre para comentar" } },
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
      { erros: { _geral: "comentário inválido" } },
      { status: 400 },
    );
  }

  const { entryId } = await contexto.params;

  try
  {
    const resultado = await comentarReviewDoSistema({
      userId,
      entryId,
      texto: analise.data.texto,
    });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: "resenha não encontrada" } },
        { status: 404 },
      );
    }

    if (resultado.estado === "comentario_invalido")
    {
      return NextResponse.json(
        { erros: { _geral: "comentário vazio ou longo demais" } },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  }
  catch (erro)
  {
    console.error("[reviews] falha ao comentar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível agora" } },
      { status: 500 },
    );
  }
}
