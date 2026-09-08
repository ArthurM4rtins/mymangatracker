/**
 * Assinatura e verificação do token de sessão (JWT HS256, via `jose`).
 *
 * O payload carrega o `sub` (userId) e o `ver` (versão para revogar, #137):
 * o que estiver no token vaza para quem tiver o cookie, então e-mail, papel e
 * nome ficam fora. `ver` é um inteiro sem significado fora da comparação. Token inválido ou
 * expirado é ausência de sessão (null), nunca erro — quem decide o que fazer
 * com isso é o controller.
 */
import { SignJWT, jwtVerify } from "jose";

export const DURACAO_SESSAO_SEGUNDOS = 7 * 24 * 60 * 60;

export type OpcoesDeSessao = {
  segredo: string;
  /** `User.tokenVersion` no momento de assinar: sair incrementa e o token morre (#137). */
  versao: number;
  /** Injetável para testar expiração sem esperar de verdade. */
  agoraEmSegundos?: () => number;
  duracaoSegundos?: number;
};

export async function assinarSessao(
  userId: string,
  opcoes: OpcoesDeSessao,
): Promise<string>
{
  const agora = opcoes.agoraEmSegundos?.() ?? Math.floor(Date.now() / 1000);
  const duracao = opcoes.duracaoSegundos ?? DURACAO_SESSAO_SEGUNDOS;

  return new SignJWT({ ver: opcoes.versao })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(agora)
    .setExpirationTime(agora + duracao)
    .sign(new TextEncoder().encode(opcoes.segredo));
}

export type SessaoVerificada = {
  userId: string;
  /** Token assinado antes da #137 não tem `ver`: conta como 0, e morre no próximo sair. */
  versao: number;
};

export async function verificarSessao(
  token: string,
  opcoes: Pick<OpcoesDeSessao, "segredo">,
): Promise<SessaoVerificada | null>
{
  try
  {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(opcoes.segredo),
      { algorithms: ["HS256"] },
    );

    if (!payload.sub)
    {
      return null;
    }

    const ver = payload.ver;

    return { userId: payload.sub, versao: typeof ver === "number" ? ver : 0 };
  }
  catch
  {
    // Assinatura inválida, expirado, malformado: tudo é "sem sessão".
    return null;
  }
}

/**
 * O segredo de produção. Sem a variável o sistema RECUSA iniciar sessões — cair
 * num segredo padrão transformaria qualquer clone do repo em fábrica de token.
 */
export function segredoDaSessao(): string
{
  const segredo = process.env.SESSION_SECRET;

  if (!segredo)
  {
    throw new Error(
      "SESSION_SECRET ausente — gere um segredo (ver .env.example) antes de usar sessões.",
    );
  }

  return segredo;
}
