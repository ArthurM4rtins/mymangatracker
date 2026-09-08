/**
 * GET /api/v1/usuarios/:username/avatar — a foto de perfil (issue #76).
 * Pública. 404 sem foto. Cache longo: a página troca a `?v=` quando a foto
 * muda, e o ETag é a versão.
 */
import { NextResponse } from "next/server";
import { avatarDoUsuarioDoSistema, versaoDoAvatarDoSistema } from "@/server/services/avatar.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  contexto: { params: Promise<{ username: string }> },
)
{
  const { username } = await contexto.params;

  try
  {
    // Versão primeiro (#135): 404 e 304 se decidem sem ler os até 512 KB do
    // BYTEA — revalidação de navegador bem-comportado custava a leitura inteira.
    const versao = await versaoDoAvatarDoSistema(username);

    if (versao === null)
    {
      return new NextResponse(null, { status: 404 });
    }

    const etag = `"${versao.versao}"`;

    if (request.headers.get("if-none-match") === etag)
    {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    const foto = await avatarDoUsuarioDoSistema(username);

    if (foto === null)
    {
      return new NextResponse(null, { status: 404 });
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
