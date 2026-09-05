/**
 * Sessão é resolvida AQUI, na camada de controller — serviço nunca toca cookie,
 * `Request` ou `headers()` (o boundaries quebra o build se tentar).
 *
 * O cookie: httpOnly (JS da página não lê), sameSite lax, secure fora de dev,
 * com expiração igual à do JWT.
 */
import { cookies, headers } from "next/headers";
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

const PREFIXO_BEARER = "Bearer ";

/**
 * O mesmo token, chegando pela outra porta: a extensão de navegador (issue #52).
 *
 * Pedido saindo de `chrome-extension://` conta como outro site, e o Chrome se
 * recusa a anexar um cookie `sameSite: lax`. A extensão então lê o cookie do
 * nosso domínio e o reenvia neste header. Não é caminho de autenticação novo —
 * é o mesmo JWT, mesma assinatura, mesma expiração, verificado logo abaixo pela
 * mesma função. Aceitar o header não abre superfície de CSRF: header não é
 * enviado sozinho pelo navegador, ao contrário do cookie.
 */
async function tokenDoHeader(): Promise<string | undefined>
{
  const autorizacao = (await headers()).get("authorization");

  if (!autorizacao?.startsWith(PREFIXO_BEARER))
  {
    return undefined;
  }

  return autorizacao.slice(PREFIXO_BEARER.length).trim() || undefined;
}

/**
 * O userId da sessão atual, ou null. Token ausente, adulterado ou expirado é
 * ausência de sessão — nunca 500. Sem SESSION_SECRET configurado não existe
 * sessão válida possível, então também é null.
 *
 * O cookie decide quando existe: o caminho do site continua o de sempre. O
 * header só é consultado na ausência dele.
 */
export async function usuarioDaSessao(): Promise<string | null>
{
  const jarra = await cookies();
  const token = jarra.get(COOKIE_DE_SESSAO)?.value ?? (await tokenDoHeader());

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
