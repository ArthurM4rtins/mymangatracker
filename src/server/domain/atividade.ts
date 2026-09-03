/**
 * O feed da comunidade (issue #50): resenhas e listas mescladas numa linha do
 * tempo só, da mais recente à mais antiga, cortada no limite. Cada consulta
 * já vem ordenada e limitada; aqui só se intercala e se marca o tipo.
 * Empate de data: resenha antes da lista — escolha fixa, não aleatória.
 */

type Datado = { quando: Date };

export type ItemDoFeed<R extends Datado, L extends Datado> =
  | (R & { tipo: "resenha" })
  | (L & { tipo: "lista" });

export function montarFeed<R extends Datado, L extends Datado>(
  resenhas: ReadonlyArray<R>,
  listas: ReadonlyArray<L>,
  limite: number,
): Array<ItemDoFeed<R, L>>
{
  const itens: Array<ItemDoFeed<R, L>> = [
    ...resenhas.map(function (r) { return { ...r, tipo: "resenha" as const }; }),
    ...listas.map(function (l) { return { ...l, tipo: "lista" as const }; }),
  ];

  // Sort é estável: no empate, a resenha (inserida antes) fica na frente.
  return itens
    .sort(function (a, b) { return b.quando.getTime() - a.quando.getTime(); })
    .slice(0, limite);
}
