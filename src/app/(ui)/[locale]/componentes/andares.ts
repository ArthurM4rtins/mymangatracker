/**
 * Empacota uma coleção em andares de prateleira pela largura disponível: cada
 * andar leva o tanto que cabe. As medidas aqui são as mesmas que o CSS da
 * prateleira desenha (a `ColecaoVisual` as injeta como variáveis CSS), então
 * o que se calcula é o que se vê.
 */

/** O livro aberto (a vitrine do andar, ou o que está sob o mouse). */
export const LARGURA_ABERTA = 168;
/** Recuo interno do trilho, de cada lado. */
export const RECUO_DO_TRILHO = 12;
/** Vão entre um livro e outro. */
export const VAO = 4;

/** Lombada de 46, 51 ou 56 px, decidida pelo id — livros diferentes, lombadas diferentes. */
export function larguraDaLombada(id: number): number
{
  return 46 + (Math.abs(id) % 3) * 5;
}

/**
 * Corta `itens` em andares que cabem em `larguraDoTrilho`. O primeiro livro de
 * cada andar fica aberto; os demais, de lombada. Sem largura medida ainda
 * (zero), tudo vai num andar só — respeitando o teto, se houver. Um livro
 * sempre cabe, mesmo num trilho estreito demais: melhor sobrar que sumir.
 */
export function emAndaresPelaLargura<T extends { id: number }>(
  itens: readonly T[],
  larguraDoTrilho: number,
  maximoPorAndar: number = Number.POSITIVE_INFINITY,
): T[][]
{
  const util = larguraDoTrilho > 0 ? larguraDoTrilho - 2 * RECUO_DO_TRILHO : Number.POSITIVE_INFINITY;
  const andares: T[][] = [];
  let andar: T[] = [];
  let ocupado = 0;

  for (const obra of itens)
  {
    const largura = larguraDaLombada(obra.id) + VAO;
    const cabe = andar.length < maximoPorAndar && ocupado + largura <= util;

    if (andar.length > 0 && !cabe)
    {
      andares.push(andar);
      andar = [];
      ocupado = 0;
    }

    andar.push(obra);
    ocupado += andar.length === 1 ? LARGURA_ABERTA : largura;
  }

  if (andar.length > 0)
  {
    andares.push(andar);
  }

  return andares;
}
