/**
 * Sessão é resolvida AQUI, na camada de controller — serviço nunca toca cookie,
 * `Request` ou `headers()` (o boundaries quebra o build se tentar).
 *
 * O cookie: httpOnly (JS da página não lê), sameSite lax, secure fora de dev,
 * com expiração igual à do JWT.
 */
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  DURACAO_SESSAO_SEGUNDOS,
  segredoDaSessao,
  verificarSessao,
} from "@/server/infra/sessao";

export const COOKIE_DE_SESSAO = "kidoku_sessao";

export function escreverSessaoNoCookie(
  resposta: NextResponse,
  token: string,
): void
{
  resposta.cookies.set(COOKIE_DE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
    path: "/",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
}

export function apagarSessaoDoCookie(resposta: NextResponse): void
{
  resposta.cookies.set(COOKIE_DE_SESSAO, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
    path: "/",
    maxAge: 0,
  });
}

/**
 * O userId da sessão atual, ou null. Token ausente, adulterado ou expirado é
 * ausência de sessão — nunca 500. Sem SESSION_SECRET configurado não existe
 * sessão válida possível, então também é null.
 */
export async function usuarioDaSessao(): Promise<string | null>
{
  const jarra = await cookies();
  const token = jarra.get(COOKIE_DE_SESSAO)?.value;

  if (!token)
  {
    return null;
  }

  try
  {
    return await verificarSessao(token, { segredo: segredoDaSessao() });
  }
  catch
  {
    return null;
  }
}
