/**
 * POST /api/v1/listas/:id/curtida — toggle da curtida na lista (issue #51).
 * Mesmo contrato do like de resenha: { curtida, total }.
 */
import { NextResponse } from "next/server";
import { curtirListaDoSistema } from "@/server/services/lista.service";
import { ERRO } from "../../../_shared/erros";
import { usuarioDaSessao } from "../../../_shared/sessao";

export const dynamic = "force-dynamic";

export async function POST(
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
    const resultado = await curtirListaDoSistema({ userId, listaId: id });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LISTA_NAO_ENCONTRADA } },
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
    console.error("[listas] falha ao curtir:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
