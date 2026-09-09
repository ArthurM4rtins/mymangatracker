/**
 * Caso de uso: limitar tentativas de login e cadastro (#108).
 *
 * Várias chaves por pedido (ip+conta, só ip, só conta). A tentativa é GRAVADA
 * antes de contar (#132): assim N pedidos em paralelo enxergam as linhas uns
 * dos outros, e no máximo `maximo` passam por janela — antes todos liam zero e
 * todos passavam. Efeito colateral desejável: pedido bloqueado também grava, e
 * o bloqueio se estende enquanto o ataque continua. Se QUALQUER chave estourou,
 * bloqueia com a maior espera. Tudo antes do trabalho caro (o scrypt do login).
 *
 * Login que deu certo zera SÓ o par ip+conta (#133): entrar prova posse daquela
 * conta, e não diz nada sobre o resto do tráfego que compartilha o IP — zerar o
 * balde do IP deixava o atacante limpar as tentativas contra outras contas
 * entrando na dele. O balde por conta nunca é zerado pelo sucesso.
 */
import { interpretarIdentificador } from "@/server/domain/identificador-de-login";
import { hopsConfiaveis } from "@/server/infra/config";
import {
  avaliarLimite,
  chaveDeTentativa,
  type RegraDeLimite,
  type Veredito,
} from "@/server/domain/limite-de-tentativas";
import {
  contarTentativas,
  limparTentativas,
  recolherTentativasAntigas,
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
  /** Apaga o que já saiu de toda janela. Ausente = ninguém recolhe. */
  recolher?: (antesDe: Date) => Promise<void>;
  /** Injetável para o teste fixar a amostra. */
  sortear?: () => number;
};

/**
 * Recolhimento amostrado (#148, item 1).
 *
 * `limparTentativas` só é alcançado por login com SUCESSO, então linha de
 * cadastro, comentário e das outras escritas nunca era recolhida — a tabela
 * crescia sob tráfego legítimo, sem ninguém atacar. Pior agora, com a busca
 * anônima do catálogo gravando também (#134).
 *
 * Uma fração pequena dos pedidos paga a limpeza, então não há cron para manter
 * nem pedido esperando por ela com frequência. Falha do recolhimento não pode
 * derrubar o pedido: é manutenção, não a regra.
 */
const JANELA_MAIS_LONGA_MS = 60 * 60_000;
const CHANCE_DE_RECOLHER = 0.01;

async function recolherDeVezEmQuando(
  agora: Date,
  deps: DependenciasDeLimite,
): Promise<void>
{
  const recolher = deps.recolher;

  if (recolher === undefined || (deps.sortear ?? Math.random)() >= CHANCE_DE_RECOLHER)
  {
    return;
  }

  try
  {
    await recolher(new Date(agora.getTime() - JANELA_MAIS_LONGA_MS));
  }
  catch (erro)
  {
    console.error(
      "[limite] falha ao recolher tentativas antigas:",
      erro instanceof Error ? erro.message : erro,
    );
  }
}

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

  // Grava primeiro (#132): a própria linha entra na contagem de todo pedido
  // irmão que ainda vai contar, e na desta.
  await Promise.all(
    pedido.chaves.map(function ({ chave }) { return deps.registrar(pedido.escopo, chave); }),
  );

  await recolherDeVezEmQuando(agora, deps);

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
// Por conta, sem IP (#133): distribuído em muitos IPs, este é o único teto.
// Nunca zerado pelo sucesso. E-mail e nome de usuário continuam sendo duas
// chaves para a mesma conta — o que dobra o teto para 40/h, não o anula.
const LOGIN_POR_CONTA: RegraDeLimite = { maximo: 20, janelaMs: 60 * 60_000 };
const CADASTRO_POR_IP: RegraDeLimite = { maximo: 5, janelaMs: 60 * 60_000 };
// Comentário (#109): escrita autenticada sem teto era negação de serviço barata.
const COMENTARIOS_POR_USUARIO: RegraDeLimite = { maximo: 30, janelaMs: 60 * 60_000 };
// As outras escritas autenticadas (#136, achado 6): cada uma custava banco sem
// teto — avatar reescreve 512 KB por chamada; leitura, lista e estante inserem
// linha. Os numeros sao folgados para uso humano e apertados para script.
const LEITURAS_POR_USUARIO: RegraDeLimite = { maximo: 60, janelaMs: 60 * 60_000 };
const AVATARES_POR_USUARIO: RegraDeLimite = { maximo: 10, janelaMs: 60 * 60_000 };
const LISTAS_POR_USUARIO: RegraDeLimite = { maximo: 20, janelaMs: 60 * 60_000 };
const ENTRADAS_POR_USUARIO: RegraDeLimite = { maximo: 60, janelaMs: 60 * 60_000 };
// Reordenar (#146, achado 16): a escrita mais cara do sistema — uma lista no
// teto reescreve 500 linhas por pedido. Arrastar itens na tela salva a ordem
// inteira a cada solta, então o teto é folgado para quem organiza de verdade.
const ORDENS_POR_USUARIO: RegraDeLimite = { maximo: 60, janelaMs: 60 * 60_000 };
// Busca do catalogo (#134, achado 4): anonima, e cada termo novo e uma ida
// real ao AniList pela cota compartilhada. Memo nao defende, porque a chave e
// o `?q=` de quem pede. O teto e por IP e folgado: rede compartilhada cai num
// balde so, e dev local sem `x-forwarded-for` cai todo em "desconhecido".
const BUSCAS_POR_IP: RegraDeLimite = { maximo: 120, janelaMs: 60 * 60_000 };

const DEPS_DE_PRODUCAO: DependenciasDeLimite = {
  contar: contarTentativas,
  registrar: registrarTentativa,
  limpar: limparTentativas,
  recolher: recolherTentativasAntigas,
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
export type PlanoDoLogin = {
  /** O que `limitarLogin` verifica e registra. */
  limitar: { chave: string; regra: RegraDeLimite }[];
  /** O que o sucesso zera: só o par. Nem o IP (#133), nem a conta. */
  liberar: string[];
};

/** Puro: as chaves de um login e o que o sucesso pode zerar. Exportado para teste. */
export function planoDoLogin(ip: string, identificador: string): PlanoDoLogin
{
  const normalizado = interpretarIdentificador(identificador);
  const conta = normalizado?.valor ?? "";
  const par = chaveDeTentativa([ip, conta]);

  return {
    limitar: [
      { chave: par, regra: LOGIN_POR_PAR },
      { chave: chaveDeTentativa([ip]), regra: LOGIN_POR_IP },
      { chave: chaveDeTentativa([conta]), regra: LOGIN_POR_CONTA },
    ],
    liberar: [par],
  };
}

/** A composição de produção. Antes de tentar entrar. */
export function limitarLogin(pedido: { ip: string; identificador: string }): Promise<Veredito>
{
  return verificarERegistrar(
    { escopo: "login", chaves: planoDoLogin(pedido.ip, pedido.identificador).limitar },
    DEPS_DE_PRODUCAO,
  );
}

/** A composição de produção. Depois de entrar com sucesso. */
export function liberarLogin(pedido: { ip: string; identificador: string }): Promise<void>
{
  return zerar(
    { escopo: "login", chaves: planoDoLogin(pedido.ip, pedido.identificador).liberar },
    DEPS_DE_PRODUCAO,
  );
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

/** Uma escrita autenticada qualquer, chaveada pelo usuario (#136). */
function limitarPorUsuario(escopo: string, regra: RegraDeLimite, userId: string): Promise<Veredito>
{
  return verificarERegistrar(
    { escopo, chaves: [{ chave: chaveDeTentativa([userId]), regra }] },
    DEPS_DE_PRODUCAO,
  );
}

/** A composição de produção. Antes de registrar uma leitura pela extensão. */
export function limitarLeitura(pedido: { userId: string }): Promise<Veredito>
{
  return limitarPorUsuario("leitura", LEITURAS_POR_USUARIO, pedido.userId);
}

/** A composição de produção. Antes de gravar um avatar. */
export function limitarAvatar(pedido: { userId: string }): Promise<Veredito>
{
  return limitarPorUsuario("avatar", AVATARES_POR_USUARIO, pedido.userId);
}

/** A composição de produção. Antes de criar uma lista. */
export function limitarLista(pedido: { userId: string }): Promise<Veredito>
{
  return limitarPorUsuario("lista", LISTAS_POR_USUARIO, pedido.userId);
}

/** A composição de produção. Antes de adicionar à estante. */
export function limitarEntrada(pedido: { userId: string }): Promise<Veredito>
{
  return limitarPorUsuario("estante", ENTRADAS_POR_USUARIO, pedido.userId);
}

/** A composição de produção. Antes de buscar no catálogo, sem sessão. */
export function limitarBuscaDoCatalogo(pedido: { ip: string }): Promise<Veredito>
{
  return verificarERegistrar(
    {
      escopo: "catalogo",
      chaves: [{ chave: chaveDeTentativa([pedido.ip]), regra: BUSCAS_POR_IP }],
    },
    DEPS_DE_PRODUCAO,
  );
}

/** A composição de produção. Antes de reordenar os itens de uma lista. */
export function limitarOrdem(pedido: { userId: string }): Promise<Veredito>
{
  return limitarPorUsuario("ordem", ORDENS_POR_USUARIO, pedido.userId);
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

/**
 * Quantos proxies confiaveis anexam ao `x-forwarded-for` (#141). O IP e insumo
 * do limitador, e a config e infra: o controller so chega nela pela porta do
 * servico, como o health faz com `sessaoConfigurada`.
 */
export function proxiesConfiaveis(): number
{
  return hopsConfiaveis();
}
