/**
 * POST /api/v1/usuarios/:username/seguir — toggle (issue #74). Mesmo contrato
 * da curtida de lista: { ativo, total }. A si mesmo é 422, inexistente 404.
 */
import { NextResponse } from "next/server";
import { seguirUsuarioDoSistema } from "@/server/services/social.service";
import { ERRO } from "../../../_shared/erros";
import { usuarioDaSessao } from "../../../_shared/sessao";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  contexto: { params: Promise<{ username: string }> },
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

  const { username } = await contexto.params;

  try
  {
    const resultado = await seguirUsuarioDoSistema({ userId, username });

    if (resultado.estado === "nao_encontrado")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.USUARIO_NAO_ENCONTRADO } },
        { status: 404 },
      );
    }

    if (resultado.estado === "a_si_mesmo")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.PROPRIO_PERFIL } },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { ativo: resultado.ativo, total: resultado.total },
      { status: 200 },
    );
  }
  catch (erro)
  {
    console.error("[usuarios] falha ao seguir:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
