/**
 * O IP de quem chamou uma ROTA, para o limite de tentativas (#108).
 *
 * A regra mora em `domain/ip-do-visitante.ts`, porque a página do catálogo
 * precisa dela também e a camada de tela não importa da camada de controller
 * (#134). Aqui fica só a ponte: um `Request` vira leitor de cabeçalho.
 */
import { escolherIp, IP_DESCONHECIDO } from "@/server/domain/ip-do-visitante";
import { proxiesConfiaveis } from "@/server/services/limite.service";

export { IP_DESCONHECIDO };

export type OpcoesDeIp = {
  /** Quantos proxies confiaveis anexam ao `x-forwarded-for`. Injetavel para teste. */
  hops: number;
};

export function ipDoPedido(
  request: Request,
  opcoes: OpcoesDeIp = { hops: proxiesConfiaveis() },
): string
{
  return escolherIp(function (nome) { return request.headers.get(nome); }, opcoes.hops);
}
