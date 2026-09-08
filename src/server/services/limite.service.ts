/**
 * Caso de uso: limitar tentativas de login e cadastro (#108).
 *
 * Várias chaves por pedido (ex.: ip+e-mail e só ip). Se QUALQUER uma estourou,
 * bloqueia com a maior espera e não registra nada. Se todas passam, registra a
 * tentativa em cada uma ANTES do trabalho caro (o scrypt do login) — é o custo
 * que se quer proteger. Login que deu certo zera as chaves: quem entra de
 * verdade não acumula.
 */
import { interpretarIdentificador } from "@/server/domain/identificador-de-login";
import {
  avaliarLimite,
  chaveDeTentativa,
  type RegraDeLimite,
  type Veredito,
} from "@/server/domain/limite-de-tentativas";
import {
  contarTentativas,
  limparTentativas,
  registrarTentativa,
} from "@/server/repositories/auth-attempt.repository";

export type DependenciasDeLimite = {
  contar: (
    escopo: string,
    chave: string,
    desde: Date,
  ) => Promise<{ total: number; maisAntiga: Date | null }>;
  registrar: (escopo: string, chave: string) => Promise<void>;
  limpar: (escopo: string, chave: string) => Promise<void>;
};

export async function verificarERegistrar(
  pedido: {
    escopo: string;
    chaves: { chave: string; regra: RegraDeLimite }[];
    agora?: Date;
  },
  deps: DependenciasDeLimite,
): Promise<Veredito>
{
  const agora = pedido.agora ?? new Date();

  const vereditos = await Promise.all(
    pedido.chaves.map(async function ({ chave, regra })
    {
      const desde = new Date(agora.getTime() - regra.janelaMs);
      const { total, maisAntiga } = await deps.contar(pedido.escopo, chave, desde);

      return avaliarLimite(total, maisAntiga, agora, regra);
    }),
  );

  let esperarSegundos = 0;

  for (const veredito of vereditos)
  {
    if (veredito.bloqueado)
    {
      esperarSegundos = Math.max(esperarSegundos, veredito.esperarSegundos);
    }
  }

  if (esperarSegundos > 0)
  {
    return { bloqueado: true, esperarSegundos };
  }

  await Promise.all(
    pedido.chaves.map(function ({ chave }) { return deps.registrar(pedido.escopo, chave); }),
  );

  return { bloqueado: false };
}

export async function zerar(
  pedido: { escopo: string; chaves: string[] },
  deps: DependenciasDeLimite,
): Promise<void>
{
  await Promise.all(
    pedido.chaves.map(function (chave) { return deps.limpar(pedido.escopo, chave); }),
  );
}

// As regras de produção. IP de desenvolvimento local não traz x-forwarded-for
// e cai no mesmo balde — por isso o teto por IP é folgado.
const LOGIN_POR_PAR: RegraDeLimite = { maximo: 5, janelaMs: 15 * 60_000 };
const LOGIN_POR_IP: RegraDeLimite = { maximo: 30, janelaMs: 60 * 60_000 };
const CADASTRO_POR_IP: RegraDeLimite = { maximo: 5, janelaMs: 60 * 60_000 };
// Comentário (#109): escrita autenticada sem teto era negação de serviço barata.
const COMENTARIOS_POR_USUARIO: RegraDeLimite = { maximo: 30, janelaMs: 60 * 60_000 };

const DEPS_DE_PRODUCAO: DependenciasDeLimite = {
  contar: contarTentativas,
  registrar: registrarTentativa,
  limpar: limparTentativas,
};

/**
 * O balde do par usa o identificador NORMALIZADO (#166): sem isso "A@x.com" e
 * "a@x.com" caem em baldes diferentes, e cada variação de maiúscula rende
 * tentativas extras contra a mesma conta.
 *
 * E-mail e nome de usuário continuam sendo duas strings para a mesma conta,
 * então alternar entre elas dobra o balde do par. De um IP só isso não rende
 * nada — o balde por IP (30/h) já é o gargalo. Distribuído, o buraco é a
 * ausência de teto por conta, que é o achado 3 da auditoria (#133).
 */
function chavesDoLogin(ip: string, identificador: string)
{
  const normalizado = interpretarIdentificador(identificador);

  return {
    par: chaveDeTentativa([ip, normalizado?.valor ?? ""]),
    ip: chaveDeTentativa([ip]),
  };
}

/** A composição de produção. Antes de tentar entrar. */
export function limitarLogin(pedido: { ip: string; identificador: string }): Promise<Veredito>
{
  const { par, ip } = chavesDoLogin(pedido.ip, pedido.identificador);

  return verificarERegistrar(
    {
      escopo: "login",
      chaves: [{ chave: par, regra: LOGIN_POR_PAR }, { chave: ip, regra: LOGIN_POR_IP }],
    },
    DEPS_DE_PRODUCAO,
  );
}

/** A composição de produção. Depois de entrar com sucesso. */
export function liberarLogin(pedido: { ip: string; identificador: string }): Promise<void>
{
  const { par, ip } = chavesDoLogin(pedido.ip, pedido.identificador);

  return zerar({ escopo: "login", chaves: [par, ip] }, DEPS_DE_PRODUCAO);
}

/** A composição de produção. Antes de gravar um comentário. */
export function limitarComentario(pedido: { userId: string }): Promise<Veredito>
{
  return verificarERegistrar(
    {
      escopo: "comentario",
      chaves: [{ chave: chaveDeTentativa([pedido.userId]), regra: COMENTARIOS_POR_USUARIO }],
    },
    DEPS_DE_PRODUCAO,
  );
}

/** A composição de produção. Antes de cadastrar. */
export function limitarCadastro(pedido: { ip: string }): Promise<Veredito>
{
  return verificarERegistrar(
    {
      escopo: "cadastro",
      chaves: [{ chave: chaveDeTentativa([pedido.ip]), regra: CADASTRO_POR_IP }],
    },
    DEPS_DE_PRODUCAO,
  );
}
