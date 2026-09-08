/**
 * O IP de quem chamou, para o limite de tentativas (#108).
 *
 * Achado 11 da auditoria (#141): o valor vinha do PRIMEIRO `x-forwarded-for`,
 * que e quem ataca que escreve — cada header forjado era um balde novo e vazio
 * no limitador. A regra agora:
 *
 * 1. `x-vercel-forwarded-for` ganha de tudo: e a plataforma quem o escreve, o
 *    cliente nao consegue sobrepor.
 * 2. Senao, `x-forwarded-for` lido da DIREITA: proxy confiavel ANEXA o IP real
 *    no fim; o cliente so consegue prepor. `hops` e quantos proxies confiaveis
 *    ha na frente (um na Vercel): com dois, o ultimo e o IP da borda vista pelo
 *    balanceador, e o cliente e o segundo da direita.
 * 3. O que nao for IP valido vira "desconhecido" — nunca chave arbitraria.
 *
 * `x-real-ip` deixou de contar: e tao forjavel quanto o resto. Sem header
 * nenhum (dev local) todo mundo cai em "desconhecido", e o teto por IP e
 * folgado por causa disso.
 */
import { isIP } from "node:net";
import { proxiesConfiaveis } from "@/server/services/limite.service";

export const IP_DESCONHECIDO = "desconhecido";

export type OpcoesDeIp = {
  /** Quantos proxies confiaveis anexam ao `x-forwarded-for`. Injetavel para teste. */
  hops: number;
};

export function ipDoPedido(
  request: Request,
  opcoes: OpcoesDeIp = { hops: proxiesConfiaveis() },
): string
{
  const daPlataforma = request.headers.get("x-vercel-forwarded-for")?.trim();

  if (daPlataforma)
  {
    return isIP(daPlataforma) ? daPlataforma : IP_DESCONHECIDO;
  }

  const encadeado = request.headers.get("x-forwarded-for");

  if (!encadeado)
  {
    return IP_DESCONHECIDO;
  }

  const partes = encadeado.split(",").map(function (parte) { return parte.trim(); });
  const hops = Math.max(1, Math.floor(opcoes.hops));
  const candidato = partes[partes.length - hops];

  return candidato && isIP(candidato) ? candidato : IP_DESCONHECIDO;
}
