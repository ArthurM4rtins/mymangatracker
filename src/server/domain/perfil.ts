/**
 * As regras do perfil (issue #49).
 *
 * A estante (status e capítulo) é do DONO: só ele vê, e vê em contagens com
 * os cinco status sempre presentes. Para todo mundo o que aparece é o que a
 * pessoa fez em cima de obras — nota, resenha, lista. A grade de avaliadas
 * vem filtrável por nota e ordenável por data ou nota; os parâmetros chegam
 * da URL, então tudo passa por whitelist e valor estranho cai em silêncio.
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

export function contarPorStatus(
  entradas: ReadonlyArray<{ status: StatusDaEstante }>,
): ContagemDaEstante
{
  const contagem = Object.fromEntries(
    STATUS_DA_ESTANTE.map(function (status) { return [status, 0]; }),
  ) as ContagemDaEstante;

  for (const entrada of entradas)
  {
    contagem[entrada.status] += 1;
  }

  return contagem;
}

export const ORDENS_DAS_AVALIADAS = [
  "recentes",
  "antigas",
  "maior_nota",
  "menor_nota",
] as const;

export type OrdemDasAvaliadas = (typeof ORDENS_DAS_AVALIADAS)[number];

export type FiltroDasAvaliadas = {
  ordem: OrdemDasAvaliadas;
  /** Nota exata, 0,5 a 5,0. Ausente = todas. */
  nota?: number;
};

export function interpretarFiltroDasAvaliadas(params: {
  ordem?: string;
  nota?: string;
}): FiltroDasAvaliadas
{
  const filtro: FiltroDasAvaliadas = {
    ordem: (ORDENS_DAS_AVALIADAS as readonly string[]).includes(params.ordem ?? "")
      ? (params.ordem as OrdemDasAvaliadas)
      : "recentes",
  };

  const nota = Number(params.nota);

  if (nota >= 0.5 && nota <= 5 && Number.isInteger(nota * 2))
  {
    filtro.nota = nota;
  }

  return filtro;
}

type Avaliada = { rating: number; avaliadaEm: Date };

/** Filtra pela nota (quando há) e ordena. Não altera a entrada. */
export function ordenarAvaliadas<T extends Avaliada>(
  itens: ReadonlyArray<T>,
  filtro: FiltroDasAvaliadas,
): T[]
{
  const filtradas =
    filtro.nota === undefined
      ? [...itens]
      : itens.filter(function (item) { return item.rating === filtro.nota; });

  const maisRecente = function (a: Avaliada, b: Avaliada)
  {
    return b.avaliadaEm.getTime() - a.avaliadaEm.getTime();
  };

  switch (filtro.ordem)
  {
    case "antigas":
      return filtradas.sort(function (a, b) { return -maisRecente(a, b); });
    case "maior_nota":
      return filtradas.sort(function (a, b)
      {
        return b.rating - a.rating || maisRecente(a, b);
      });
    case "menor_nota":
      return filtradas.sort(function (a, b)
      {
        return a.rating - b.rating || maisRecente(a, b);
      });
    default:
      return filtradas.sort(maisRecente);
  }
}
