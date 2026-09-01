/**
 * POST /api/v1/reviews/:entryId/curtida — toggle da curtida na resenha.
 */
import { NextResponse } from "next/server";
import { curtirReviewDoSistema } from "@/server/services/review-social.service";
import { usuarioDaSessao } from "../../../_shared/sessao";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  contexto: { params: Promise<{ entryId: string }> },
)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json(
      { erros: { _geral: "entre para curtir" } },
      { status: 401 },
    );
  }

  const { entryId } = await contexto.params;

  try
  {
    const resultado = await curtirReviewDoSistema({ userId, entryId });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: "resenha não encontrada" } },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { curtida: resultado.curtida, total: resultado.total },
      { status: 200 },
    );
  }
  catch (erro)
  {
    console.error("[reviews] falha ao curtir:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível agora" } },
      { status: 500 },
    );
  }
}
