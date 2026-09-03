/**
 * Ordenação da listagem pública de listas (issue #80), lida da URL. Whitelist
 * como no catálogo: valor desconhecido ou ausente cai em "recentes" — nunca
 * vira consulta solta.
 */
export const ORDENS_DAS_LISTAS = ["recentes", "curtidas"] as const;

export type OrdemDasListas = (typeof ORDENS_DAS_LISTAS)[number];

export function interpretarOrdemDasListas(valor: unknown): OrdemDasListas
{
  return typeof valor === "string" && (ORDENS_DAS_LISTAS as readonly string[]).includes(valor)
    ? (valor as OrdemDasListas)
    : "recentes";
}
