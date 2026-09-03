/**
 * GET /api/v1/usuarios/:username/avatar — a foto de perfil (issue #76).
 * Pública. 404 sem foto. Cache longo: a página troca a `?v=` quando a foto
 * muda, e o ETag é a versão.
 */
import { NextResponse } from "next/server";
import { avatarDoUsuarioDoSistema } from "@/server/services/avatar.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  contexto: { params: Promise<{ username: string }> },
)
{
  const { username } = await contexto.params;

  try
  {
    const foto = await avatarDoUsuarioDoSistema(username);

    if (foto === null)
    {
      return new NextResponse(null, { status: 404 });
    }

    const etag = `"${foto.versao}"`;

    if (request.headers.get("if-none-match") === etag)
    {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    return new NextResponse(new Uint8Array(foto.bytes), {
      status: 200,
      headers: {
        "Content-Type": foto.mime,
        "Content-Length": String(foto.bytes.byteLength),
        ETag: etag,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }
  catch (erro)
  {
    console.error("[usuarios] falha ao servir avatar:", erro instanceof Error ? erro.message : erro);
    return new NextResponse(null, { status: 500 });
  }
}
