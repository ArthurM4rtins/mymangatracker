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
  verificarSessao,
  type SessaoVerificada,
} from "@/server/infra/sessao";
import {
  buscarCredenciaisPorEmail,
  buscarCredenciaisPorUsername,
  buscarVersaoDoToken,
  incrementarVersaoDoToken,
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

type Credenciais = { id: string; passwordHash: string; locale: string | null; tokenVersion: number };

export type DependenciasDaSessao = {
  buscarPorEmail: (email: string) => Promise<Credenciais | null>;
  buscarPorUsername: (usernameNormalizado: string) => Promise<Credenciais | null>;
  /** A versão atual vai no token: ele já nasce válido (#137). */
  assinarToken: (userId: string, versao: number) => Promise<string>;
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
    token: await deps.assinarToken(credenciais.id, credenciais.tokenVersion),
    locale: credenciais.locale,
  };
}

/** A composição de produção: repositório de verdade + JWT com o segredo do ambiente. */
export function entrarNoSistema(login: Login): Promise<SessaoAberta | null>
{
  return entrar(login, {
    buscarPorEmail: buscarCredenciaisPorEmail,
    buscarPorUsername: buscarCredenciaisPorUsername,
    assinarToken: function (userId, versao)
    {
      return assinarSessao(userId, { segredo: segredoDaSessao(), versao });
    },
  });
}

// ---------------------------------------------------------------------------
// Resolver a sessão e sair (#137). A comparação de versão mora aqui: infra não
// lê repositório, e controller não contém regra.
// ---------------------------------------------------------------------------

export type DependenciasDoResolver = {
  verificar: (token: string) => Promise<SessaoVerificada | null>;
  buscarVersao: (userId: string) => Promise<number | null>;
};

/**
 * O userId da sessão, ou `null`. Token inválido, expirado, de usuário que não
 * existe mais, ou assinado antes do último "sair" — tudo é ausência de sessão,
 * indistinguível de propósito.
 */
export async function resolverSessao(
  token: string,
  deps: DependenciasDoResolver,
): Promise<string | null>
{
  const verificada = await deps.verificar(token);

  if (verificada === null)
  {
    return null;
  }

  const versaoAtual = await deps.buscarVersao(verificada.userId);

  if (versaoAtual === null || versaoAtual !== verificada.versao)
  {
    return null;
  }

  return verificada.userId;
}

export type DependenciasDoSair = {
  incrementarVersao: (userId: string) => Promise<void>;
};

/** Sair revoga: incrementa a versão, e todo token assinado antes morre de uma vez. */
export async function sair(userId: string, deps: DependenciasDoSair): Promise<void>
{
  await deps.incrementarVersao(userId);
}

/** A composição de produção. */
export function resolverSessaoNoSistema(token: string): Promise<string | null>
{
  return resolverSessao(token, {
    verificar: function (t)
    {
      return verificarSessao(t, { segredo: segredoDaSessao() });
    },
    buscarVersao: buscarVersaoDoToken,
  });
}

/** A composição de produção. */
export function sairDoSistema(userId: string): Promise<void>
{
  return sair(userId, { incrementarVersao: incrementarVersaoDoToken });
}
