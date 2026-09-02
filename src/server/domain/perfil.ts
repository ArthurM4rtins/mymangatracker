/**
 * O perfil público (issue #49) mostra a estante só em CONTAGENS por status —
 * nunca as obras, nunca o capítulo. Regra pura: o banco devolve só os status
 * que têm linha; aqui os cinco aparecem sempre, com zero onde não há nada.
 */

export const STATUS_DA_ESTANTE = [
  "READING",
  "COMPLETED",
  "PLANNED",
  "PAUSED",
  "DROPPED",
] as const;

export type StatusDaEstante = (typeof STATUS_DA_ESTANTE)[number];

export type ContagemDaEstante = Record<StatusDaEstante, number>;

export function contagemPorStatus(
  linhas: ReadonlyArray<{ status: StatusDaEstante; total: number }>,
): ContagemDaEstante
{
  const contagem = Object.fromEntries(
    STATUS_DA_ESTANTE.map(function (status) { return [status, 0]; }),
  ) as ContagemDaEstante;

  for (const linha of linhas)
  {
    contagem[linha.status] = linha.total;
  }

  return contagem;
}

export function totalDaEstante(contagem: ContagemDaEstante): number
{
  return STATUS_DA_ESTANTE.reduce(function (soma, status)
  {
    return soma + contagem[status];
  }, 0);
}
