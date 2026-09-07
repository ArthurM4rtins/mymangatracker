/**
 * DELETE /api/v1/comentarios/:id — apagar o PRÓPRIO comentário. Alheio ou
 * inexistente respondem igual: 404.
 */
import { NextResponse } from "next/server";
import { apagarComentarioDoSistema } from "@/server/services/review-social.service";
import { ERRO } from "../../_shared/erros";
import { usuarioDaSessao } from "../../_shared/sessao";

export const dynamic = "force-dynamic";

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
    const resultado = await apagarComentarioDoSistema({ userId, comentarioId: id });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.COMENTARIO_NAO_ENCONTRADO } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[comentarios] falha ao apagar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
