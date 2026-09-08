/**
 * Caso de uso: entrar.
 *
 * Senha errada e usuário inexistente são o MESMO resultado (null) e pagam o
 * MESMO custo de scrypt — diferenciar entregaria a lista de e-mails cadastrados,
 * pela resposta ou pelo tempo dela. A senha recebida não é logada em nenhum
 * caminho, nem de erro.
 *
 * O identificador é e-mail OU nome de usuário (#166), e a regra acima vale
 * igual nas duas portas: nome de usuário inexistente também paga o scrypt
 * contra o hash fantasma, senão o tempo de resposta vira sonda de quais nomes
 * existem.
 */
import { interpretarIdentificador } from "@/server/domain/identificador-de-login";
import { verificarSenha } from "@/server/domain/senha";
import {
  assinarSessao,
  segredoDaSessao,
} from "@/server/infra/sessao";
import {
  buscarCredenciaisPorEmail,
  buscarCredenciaisPorUsername,
} from "@/server/repositories/usuario.repository";

export type Login = {
  /** E-mail ou nome de usuário, como a pessoa digitou. */
  identificador: string;
  senha: string;
};

export type SessaoAberta = {
  token: string;
  /**
   * O idioma escolhido pela conta, ou null se ela nunca escolheu. Quem escreve
   * o cookie é o controller — o serviço não conhece cookie (#116, fase 5).
   */
  locale: string | null;
};

type Credenciais = { id: string; passwordHash: string; locale: string | null };

export type DependenciasDaSessao = {
  buscarPorEmail: (email: string) => Promise<Credenciais | null>;
  buscarPorUsername: (usernameNormalizado: string) => Promise<Credenciais | null>;
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
  const identificador = interpretarIdentificador(login.identificador);

  if (identificador === null)
  {
    // Campo vazio não é tentativa de login: nada a consultar e nada a comparar.
    return null;
  }

  const credenciais =
    identificador.tipo === "email"
      ? await deps.buscarPorEmail(identificador.valor)
      : await deps.buscarPorUsername(identificador.valor);

  const hash = credenciais?.passwordHash ?? HASH_FANTASMA;

  const senhaConfere = await verificarHash(login.senha, hash);

  if (!credenciais || !senhaConfere)
  {
    return null;
  }

  return {
    token: await deps.assinarToken(credenciais.id),
    locale: credenciais.locale,
  };
}

/** A composição de produção: repositório de verdade + JWT com o segredo do ambiente. */
export function entrarNoSistema(login: Login): Promise<SessaoAberta | null>
{
  return entrar(login, {
    buscarPorEmail: buscarCredenciaisPorEmail,
    buscarPorUsername: buscarCredenciaisPorUsername,
    assinarToken: function (userId)
    {
      return assinarSessao(userId, { segredo: segredoDaSessao() });
    },
  });
}
