/**
 * Limite de tentativas (#108): regra pura para login e cadastro.
 *
 * Dado quantas tentativas houve na janela e quando foi a mais antiga, decide
 * se bloqueia e quanto esperar. Quem conta e quem registra é o repositório;
 * quem junta as chaves é o serviço. Aqui só a matemática.
 */
import { createHmac } from "node:crypto";

export type RegraDeLimite = {
  /**
   * Tentativas permitidas dentro da janela. A de número `maximo + 1` bloqueia.
   * A contagem que chega aqui JÁ inclui a tentativa atual (#132): o serviço
   * grava antes de contar, para que pedidos em paralelo se enxerguem.
   */
  maximo: number;
  janelaMs: number;
};

export type Veredito =
  | { bloqueado: false }
  | { bloqueado: true; esperarSegundos: number };

export function avaliarLimite(
  tentativasNaJanela: number,
  maisAntigaNaJanela: Date | null,
  agora: Date,
  regra: RegraDeLimite,
): Veredito
{
  if (tentativasNaJanela <= regra.maximo || maisAntigaNaJanela === null)
  {
    return { bloqueado: false };
  }

  const liberaEm = maisAntigaNaJanela.getTime() + regra.janelaMs;
  const esperarSegundos = Math.max(1, Math.ceil((liberaEm - agora.getTime()) / 1000));

  return { bloqueado: true, esperarSegundos };
}

/**
 * A chave gravada no banco. Hash, não texto: a tabela de tentativas não pode
 * virar uma lista de e-mails e IPs em claro. E-mail entra em minúsculas, como
 * no cadastro e no login.
 *
 * HMAC com pepper (#148, item 5). Antes era SHA-256 puro sobre entradas de
 * entropia baixíssima: quem tivesse um dump precomputava os 2^32 endereços IPv4
 * e recuperava exatamente o que este docblock promete esconder. Com pepper, o
 * dump sozinho não basta — o segredo não mora no banco.
 *
 * O pepper vem por PARÂMETRO porque o domínio não importa nada do projeto. Sem
 * ele a chave continua estável, só não protege contra dump: é o modo de
 * desenvolvimento, e a variável ausente não pode quebrar o app.
 */
export function chaveDeTentativa(partes: string[], pepper = ""): string
{
  const normalizadas = partes.map(function (parte) { return parte.trim().toLowerCase(); });

  return createHmac("sha256", pepper).update(normalizadas.join("\n")).digest("hex");
}
