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
import { usuarioDaSessao } from "../../_shared/sessao";

export const dynamic = "force-dynamic";

const MENSAGEM: Record<string, string> = {
  tipo_invalido: "envie uma imagem JPEG, PNG ou WebP",
  tamanho_invalido: "a imagem passou de 512 KB",
};

export async function PUT(request: Request)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json({ erros: { _geral: "entre para trocar a foto" } }, { status: 401 });
  }

  const declarado = Number(request.headers.get("content-length") ?? 0);

  if (declarado > LIMITE_DO_AVATAR_BYTES)
  {
    return NextResponse.json({ erros: { _geral: MENSAGEM.tamanho_invalido } }, { status: 413 });
  }

  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();

  try
  {
    const bytes = new Uint8Array(await request.arrayBuffer());
    const resultado = await definirAvatarDoSistema({ userId, mime, bytes });

    if (resultado.estado === "invalido")
    {
      return NextResponse.json(
        { erros: { _geral: MENSAGEM[resultado.motivo] } },
        { status: resultado.motivo === "tamanho_invalido" ? 413 : 415 },
      );
    }

    return NextResponse.json({ versao: resultado.versao }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[perfil] falha ao salvar avatar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erros: { _geral: "não foi possível agora" } }, { status: 500 });
  }
}

export async function DELETE()
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json({ erros: { _geral: "entre para remover a foto" } }, { status: 401 });
  }

  try
  {
    await removerAvatarDoSistema({ userId });

    return new NextResponse(null, { status: 204 });
  }
  catch (erro)
  {
    console.error("[perfil] falha ao remover avatar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erros: { _geral: "não foi possível agora" } }, { status: 500 });
  }
}
