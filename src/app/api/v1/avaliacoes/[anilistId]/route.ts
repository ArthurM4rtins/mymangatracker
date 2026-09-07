/**
 * DELETE /api/v1/avaliacoes/:anilistId — remover a avaliação da obra.
 * Inexistente responde 404.
 */
import { NextResponse } from "next/server";
import { removerAvaliacaoDoSistema } from "@/server/services/avaliacao.service";
import { ERRO } from "../../_shared/erros";
import { usuarioDaSessao } from "../../_shared/sessao";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  contexto: { params: Promise<{ anilistId: string }> },
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

  const anilistId = Number((await contexto.params).anilistId);

  if (!Number.isInteger(anilistId) || anilistId <= 0)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.OBRA_INVALIDA } },
      { status: 400 },
    );
  }

  try
  {
    const resultado = await removerAvaliacaoDoSistema({ userId, anilistId });

    if (resultado.estado !== "ok")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.AVALIACAO_NAO_ENCONTRADA } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[avaliacoes] falha ao remover:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
