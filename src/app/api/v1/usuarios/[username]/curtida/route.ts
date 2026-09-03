/**
 * POST /api/v1/usuarios/:username/curtida — toggle (issue #74). Mesmo contrato
 * da curtida de lista: { ativo, total }. A si mesmo é 422, inexistente 404.
 */
import { NextResponse } from "next/server";
import { curtirPerfilDoSistema } from "@/server/services/social.service";
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
      { erros: { _geral: "entre para curtir" } },
      { status: 401 },
    );
  }

  const { username } = await contexto.params;

  try
  {
    const resultado = await curtirPerfilDoSistema({ userId, username });

    if (resultado.estado === "nao_encontrado")
    {
      return NextResponse.json(
        { erros: { _geral: "usuário não encontrado" } },
        { status: 404 },
      );
    }

    if (resultado.estado === "a_si_mesmo")
    {
      return NextResponse.json(
        { erros: { _geral: "não vale para o próprio perfil" } },
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
    console.error("[usuarios] falha ao curtir:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível agora" } },
      { status: 500 },
    );
  }
}
