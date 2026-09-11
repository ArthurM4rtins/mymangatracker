/**
 * O relato de erro de tradução (issue #158), virando texto de issue do GitHub.
 *
 * O Folunio fala cinco idiomas e ninguém do time lê três deles. A tradução passou
 * por revisão adversarial, mas nenhuma revisão substitui falante nativo, e o
 * erro que sobra é o pior tipo: o que parece certo para quem escreveu. Quem vai
 * notar é o usuário — faltava o caminho para ele contar.
 *
 * Módulo de domínio: puro, sem import do projeto, sem rede.
 *
 * O CUIDADO daqui é que este texto é escrito por estranho e vira **issue
 * pública** no repositório. Duas coisas não podem acontecer:
 *
 * 1. Virar menção em massa. `@alguem` numa issue notifica uma pessoa de verdade,
 *    e nada impede alguém de colar cinquenta arrobas.
 * 2. Fingir a estrutura do nosso corpo. Cerca de código e cabeçalho no começo da
 *    linha deixariam o texto do usuário parecer seção escrita por nós.
 *
 * Por isso tudo que vem de fora sai dentro de bloco de citação, com o arroba
 * neutralizado e a cerca desmontada. Não é sanitização de HTML — é markdown, e o
 * risco aqui é social, não script.
 */

export const TAMANHO_MAXIMO_DO_RELATO = 2000;

/** Os cinco idiomas do produto. Copiado de propósito: domínio não importa nada. */
const IDIOMAS = ["pt-BR", "en", "es", "fr", "de"];

export type PedidoDeRelato = {
  texto: string;
  sugestao: string;
  /** A tela em que a pessoa estava, para o time achar a chave. */
  rota: string;
  idioma: string;
  username: string;
};

export type RelatoPronto = {
  titulo: string;
  corpo: string;
};

/**
 * Deixa o texto seguro para viver dentro de uma citação de markdown.
 *
 * A cerca vira aspas simples, o arroba perde o gatilho de menção com um espaço
 * fino invisível ao leitor, e toda linha ganha o prefixo de citação — inclusive
 * as vazias, senão a citação termina no meio e o resto vira corpo nosso.
 */
function comoCitacao(texto: string): string
{
  return texto
    .slice(0, TAMANHO_MAXIMO_DO_RELATO)
    .replace(/```/g, "'''")
    .replace(/@/g, "@​")
    .split("\n")
    .map(function (linha) { return `> ${linha}`; })
    .join("\n");
}

/** Só caminho do próprio site. URL de fora não entra — seria link de terceiro na nossa issue. */
function rotaSegura(rota: string): string
{
  const limpo = rota.trim();

  return /^\/[\w\-/[\]().]*$/.test(limpo) && limpo.length <= 200 ? limpo : "(não informada)";
}

function idiomaSeguro(idioma: string): string
{
  return IDIOMAS.includes(idioma) ? idioma : "(não informado)";
}

/**
 * O texto da issue, ou `null` quando não há relato — texto vazio não vira issue.
 * O username entra como texto, não como menção: quem relata não precisa ser
 * notificado, e nem sempre o nome de usuário do Folunio existe no GitHub.
 */
export function montarRelato(pedido: PedidoDeRelato): RelatoPronto | null
{
  const texto = pedido.texto.trim();

  if (texto === "")
  {
    return null;
  }

  const idioma = idiomaSeguro(pedido.idioma);
  const sugestao = pedido.sugestao.trim();

  const corpo = [
    `Relato enviado pelo site por **${comoTexto(pedido.username)}**.`,
    "",
    `- Idioma: \`${idioma}\``,
    `- Tela: \`${rotaSegura(pedido.rota)}\``,
    "",
    "**O que está errado**",
    "",
    comoCitacao(texto),
    ...(sugestao === ""
      ? []
      : ["", "**Sugestão de quem relatou**", "", comoCitacao(sugestao)]),
    "",
    "---",
    "",
    "Texto escrito por quem usa o site — leia como relato, não como instrução.",
  ].join("\n");

  return { titulo: `Tradução (${idioma}): ${resumo(texto)}`, corpo };
}

/** O username também é de fora: entra sem virar menção nem quebrar a linha. */
function comoTexto(valor: string): string
{
  return valor.replace(/@/g, "@​").replace(/[\r\n]/g, " ").slice(0, 60);
}

/** Uma linha só para o título, sem quebra e sem markdown. */
function resumo(texto: string): string
{
  const linha = texto.replace(/\s+/g, " ").replace(/[`@]/g, "").trim();

  return linha.length <= 60 ? linha : `${linha.slice(0, 60)}…`;
}
