/**
 * DELETE /api/v1/avaliacoes/:entradaId — remover a avaliação da obra daquela
 * entrada. Alheia ou inexistente respondem igual: 404.
 */
import { NextResponse } from "next/server";
import { removerAvaliacaoDoSistema } from "@/server/services/avaliacao.service";
import { usuarioDaSessao } from "../../_shared/sessao";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  contexto: { params: Promise<{ entradaId: string }> },
)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json(
      { erros: { _geral: "entre para avaliar" } },
      { status: 401 },
    );
  }

  const { entradaId } = await contexto.params;

  try
  {
    const resultado = await removerAvaliacaoDoSistema({ userId, entradaId });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: "avaliação não encontrada" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[avaliacoes] falha ao remover:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível remover agora" } },
      { status: 500 },
    );
  }
}
