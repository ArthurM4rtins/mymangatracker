/**
 * Qual IP é o de quem chamou, dados os cabeçalhos (#108, achado 11 da #141).
 *
 * Vive no domínio porque as DUAS bordas precisam da mesma regra e nenhuma pode
 * importar a outra (#134): a rota tem um `Request`, a página server component
 * tem `headers()`, e a camada de tela não importa da camada de controller.
 * Aqui não há nem `Request` nem `headers()` — só um leitor de cabeçalho.
 *
 * A regra, que é a parte delicada:
 *
 * 1. `x-vercel-forwarded-for` ganha de tudo: é a plataforma quem o escreve, o
 *    cliente não consegue sobrepor.
 * 2. Senão, `x-forwarded-for` lido da DIREITA: proxy confiável ANEXA o IP real
 *    no fim; o cliente só consegue prepor. `hops` é quantos proxies confiáveis
 *    há na frente (um na Vercel).
 * 3. O que não for IP válido vira "desconhecido" — nunca chave arbitrária.
 *
 * `x-real-ip` não conta: é tão forjável quanto o resto. Sem header nenhum (dev
 * local) todo mundo cai em "desconhecido", e por isso todo teto por IP é folgado.
 */
import { isIP } from "node:net";

export const IP_DESCONHECIDO = "desconhecido";

export type LerCabecalho = (nome: string) => string | null | undefined;

export function escolherIp(ler: LerCabecalho, hops: number): string
{
  const daPlataforma = ler("x-vercel-forwarded-for")?.trim();

  if (daPlataforma)
  {
    return isIP(daPlataforma) ? daPlataforma : IP_DESCONHECIDO;
  }

  const encadeado = ler("x-forwarded-for");

  if (!encadeado)
  {
    return IP_DESCONHECIDO;
  }

  const partes = encadeado.split(",").map(function (parte) { return parte.trim(); });
  const confiaveis = Math.max(1, Math.floor(hops));
  const candidato = partes[partes.length - confiaveis];

  return candidato && isIP(candidato) ? candidato : IP_DESCONHECIDO;
}
