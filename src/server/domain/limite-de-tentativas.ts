/**
 * Limite de tentativas (#108): regra pura para login e cadastro.
 *
 * Dado quantas tentativas houve na janela e quando foi a mais antiga, decide
 * se bloqueia e quanto esperar. Quem conta e quem registra é o repositório;
 * quem junta as chaves é o serviço. Aqui só a matemática.
 */
import { createHash } from "node:crypto";

export type RegraDeLimite = {
  /** Tentativas permitidas dentro da janela. A de número `maximo + 1` bloqueia. */
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
  if (tentativasNaJanela < regra.maximo || maisAntigaNaJanela === null)
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
 */
export function chaveDeTentativa(partes: string[]): string
{
  const normalizadas = partes.map(function (parte) { return parte.trim().toLowerCase(); });

  return createHash("sha256").update(normalizadas.join("\n")).digest("hex");
}
