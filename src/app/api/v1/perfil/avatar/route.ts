/**
 * PUT /api/v1/perfil/avatar — a foto do dono da sessão, corpo binário com o
 * Content-Type da imagem (issue #76). DELETE remove. Tipo e tamanho são
 * decididos no serviço; o tamanho é conferido antes de ler o corpo inteiro
 * quando o Content-Length vem.
 */
import { NextResponse } from "next/server";
import { LIMITE_DO_AVATAR_BYTES } from "@/server/domain/avatar";
import {
  definirAvatarDoSistema,
  removerAvatarDoSistema,
} from "@/server/services/avatar.service";
import { ERRO } from "../../_shared/erros";
import { usuarioDaSessao } from "../../_shared/sessao";

export const dynamic = "force-dynamic";

export async function PUT(request: Request)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json({ erros: { _geral: ERRO.SESSAO_NECESSARIA } }, { status: 401 });
  }

  const declarado = Number(request.headers.get("content-length") ?? 0);

  if (declarado > LIMITE_DO_AVATAR_BYTES)
  {
    return NextResponse.json({ erros: { _geral: ERRO.ARQUIVO_GRANDE_DEMAIS } }, { status: 413 });
  }

  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();

  try
  {
    const bytes = new Uint8Array(await request.arrayBuffer());
    const resultado = await definirAvatarDoSistema({ userId, mime, bytes });

    if (resultado.estado === "invalido")
    {
      return NextResponse.json(
        {
          erros: {
            _geral: resultado.motivo === "tamanho_invalido"
              ? ERRO.ARQUIVO_GRANDE_DEMAIS
              : ERRO.TIPO_DE_ARQUIVO_INVALIDO,
          },
        },
        { status: resultado.motivo === "tamanho_invalido" ? 413 : 415 },
      );
    }

    return NextResponse.json({ versao: resultado.versao }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[perfil] falha ao salvar avatar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erros: { _geral: ERRO.FALHA_INTERNA } }, { status: 500 });
  }
}

export async function DELETE()
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json({ erros: { _geral: ERRO.SESSAO_NECESSARIA } }, { status: 401 });
  }

  try
  {
    await removerAvatarDoSistema({ userId });

    return new NextResponse(null, { status: 204 });
  }
  catch (erro)
  {
    console.error("[perfil] falha ao remover avatar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erros: { _geral: ERRO.FALHA_INTERNA } }, { status: 500 });
  }
}
