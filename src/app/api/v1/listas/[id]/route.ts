/**
 * DELETE /api/v1/listas/:id — apagar a PRÓPRIA lista. Alheia ou inexistente
 * respondem igual: 404.
 */
import { NextResponse } from "next/server";
import { apagarListaDoSistema } from "@/server/services/lista.service";
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
      { erros: { _geral: "entre para usar listas" } },
      { status: 401 },
    );
  }

  const { id } = await contexto.params;

  try
  {
    const resultado = await apagarListaDoSistema({ userId, listaId: id });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: "lista não encontrada" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[listas] falha ao apagar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível agora" } },
      { status: 500 },
    );
  }
}
