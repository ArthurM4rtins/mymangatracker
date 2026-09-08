/**
 * DELETE /api/v1/estante/:id/leituras — resetar a leitura da obra (#172).
 *
 * Apaga o histórico de aberturas da entrada E zera o capítulo marcado, numa
 * transação só: o progresso é o maior entre os dois. É o desfazer da extensão;
 * quem confirma é a tela, com o número de aberturas que vão sumir.
 *
 * Entrada de outro usuário responde 404, igual à inexistente: a estante é
 * privada e não revelamos que a entrada alheia existe.
 */
import { NextResponse } from "next/server";
import { resetarLeituraNoSistema } from "@/server/services/reset-de-leitura.service";
import { ERRO } from "../../../_shared/erros";
import { usuarioDaSessao } from "../../../_shared/sessao";

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
    const resultado = await resetarLeituraNoSistema({ userId, entradaId: id });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.ENTRADA_NAO_ENCONTRADA } },
        { status: 404 },
      );
    }

    return NextResponse.json({ removidas: resultado.removidas }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[leituras] falha ao resetar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
