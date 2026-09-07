/**
 * POST /api/v1/reviews/:entryId/curtida — toggle da curtida na resenha.
 */
import { NextResponse } from "next/server";
import { curtirReviewDoSistema } from "@/server/services/review-social.service";
import { ERRO } from "../../../_shared/erros";
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
      { erros: { _geral: ERRO.SESSAO_NECESSARIA } },
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
        { erros: { _geral: ERRO.RESENHA_NAO_ENCONTRADA } },
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
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
