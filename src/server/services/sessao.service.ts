/**
 * Caso de uso: entrar.
 *
 * Senha errada e usuário inexistente são o MESMO resultado (null) e pagam o
 * MESMO custo de scrypt — diferenciar entregaria a lista de e-mails cadastrados,
 * pela resposta ou pelo tempo dela. A senha recebida não é logada em nenhum
 * caminho, nem de erro.
 */
import { verificarSenha } from "@/server/domain/senha";
import {
  assinarSessao,
  segredoDaSessao,
} from "@/server/infra/sessao";
import { buscarCredenciaisPorEmail } from "@/server/repositories/usuario.repository";

export type Login = {
  email: string;
  senha: string;
};

export type SessaoAberta = {
  token: string;
};

export type DependenciasDaSessao = {
  buscarCredenciais: (email: string) => Promise<{ id: string; passwordHash: string } | null>;
  assinarToken: (userId: string) => Promise<string>;
  verificarHash?: (senha: string, hash: string) => Promise<boolean>;
};

// Hash scrypt real de um segredo aleatório descartado. Quando o e-mail não
// existe, a verificação roda contra ele mesmo assim — o tempo de resposta fica
// igual ao de uma senha errada de conta real.
const HASH_FANTASMA =
  "scrypt$16384$8$1$YW1vc3RyYWRlc2FsdDE2$K5f0P-yzUJ2n1YQxq7d0T3f9j8wLhVtR2cE4uNqS6kIbGaXoZvMHy1D_pC8eW5mAJrO0nTxBQdUgFh3LiskYzw";

export async function entrar(
  login: Login,
  deps: DependenciasDaSessao,
): Promise<SessaoAberta | null>
{
  const verificarHash = deps.verificarHash ?? verificarSenha;

  const credenciais = await deps.buscarCredenciais(login.email.toLowerCase());
  const hash = credenciais?.passwordHash ?? HASH_FANTASMA;

  const senhaConfere = await verificarHash(login.senha, hash);

  if (!credenciais || !senhaConfere)
  {
    return null;
  }

  return { token: await deps.assinarToken(credenciais.id) };
}

/** A composição de produção: repositório de verdade + JWT com o segredo do ambiente. */
export function entrarNoSistema(login: Login): Promise<SessaoAberta | null>
{
  return entrar(login, {
    buscarCredenciais: buscarCredenciaisPorEmail,
    assinarToken: function (userId)
    {
      return assinarSessao(userId, { segredo: segredoDaSessao() });
    },
  });
}
