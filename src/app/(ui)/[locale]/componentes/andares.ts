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
/**
 * O quanto o livro aberto pode encolher para o andar fechar com o número cheio
 * de obras. Abaixo disso ele deixa de parecer uma capa, e aí é melhor o andar
 * levar uma obra a menos.
 */
export const VITRINE_MINIMA = 120;

/** Lombada de 46, 51 ou 56 px, decidida pelo id — livros diferentes, lombadas diferentes. */
export function larguraDaLombada(id: number): number
{
  return 46 + (Math.abs(id) % 3) * 5;
}

/**
 * Quanto sobra para o livro aberto depois das lombadas do andar. É por aí que
 * um andar com teto (a home pede nove) fecha com o número cheio: as lombadas
 * variam de largura, então quem cede é a vitrine — nunca abaixo de
 * `VITRINE_MINIMA`, e nunca acima do tamanho normal.
 */
export function larguraDaVitrine<T extends { id: number }>(
  andar: readonly T[],
  larguraDoTrilho: number,
): number
{
  if (larguraDoTrilho <= 0 || andar.length === 0)
  {
    return LARGURA_ABERTA;
  }

  const lombadas = andar.slice(1).reduce(function (soma, obra)
  {
    return soma + larguraDaLombada(obra.id) + VAO;
  }, 0);

  const sobra = larguraDoTrilho - 2 * RECUO_DO_TRILHO - lombadas;

  return Math.max(VITRINE_MINIMA, Math.min(LARGURA_ABERTA, sobra));
}

/**
 * Corta `itens` em andares que cabem em `larguraDoTrilho`. O primeiro livro de
 * cada andar fica aberto; os demais, de lombada. Sem largura medida ainda
 * (zero), tudo vai num andar só — respeitando o teto, se houver. Um livro
 * sempre cabe, mesmo num trilho estreito demais: melhor sobrar que sumir.
 *
 * Com teto, o andar tenta fechar com o número cheio apertando a vitrine até
 * `VITRINE_MINIMA` (#229). Se nem assim couber, volta a encher pela largura.
 */
export function emAndaresPelaLargura<T extends { id: number }>(
  itens: readonly T[],
  larguraDoTrilho: number,
  maximoPorAndar: number = Number.POSITIVE_INFINITY,
): T[][]
{
  const util = larguraDoTrilho > 0 ? larguraDoTrilho - 2 * RECUO_DO_TRILHO : Number.POSITIVE_INFINITY;
  // Com teto, a vitrine pode ceder; sem teto ela fica no tamanho cheio.
  const vitrine = Number.isFinite(maximoPorAndar) ? VITRINE_MINIMA : LARGURA_ABERTA;
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
    ocupado += andar.length === 1 ? vitrine : largura;
  }

  if (andar.length > 0)
  {
    andares.push(andar);
  }

  return andares;
}

/** Um andar já montado: de qual grupo veio, e se é o que leva o nome dele. */
export type AndarDaEstante<T> = {
  id: string;
  grupo: string;
  titulo: string;
  itens: T[];
  /** Primeiro andar do grupo: é ele que mostra o nome na tela. */
  abreOGrupo: boolean;
};

/**
 * Quebra grupos de nome próprio (a estante por status, o laboratório) em
 * andares de estante. O nome fica em cima do primeiro andar do grupo; os
 * seguintes seguem sem cabeçalho, como na home (#234).
 */
export function emAndaresDosGrupos<T extends { id: number }>(
  grupos: ReadonlyArray<{ id: string; titulo: string; itens: T[] }>,
  larguraDoTrilho: number,
  maximoPorAndar?: number,
): Array<AndarDaEstante<T>>
{
  const andares: Array<AndarDaEstante<T>> = [];

  for (const grupo of grupos)
  {
    const fatias = emAndaresPelaLargura(grupo.itens, larguraDoTrilho, maximoPorAndar);

    fatias.forEach(function (itens, indice)
    {
      andares.push({
        id: `${grupo.id}-${indice + 1}`,
        grupo: grupo.id,
        titulo: grupo.titulo,
        itens,
        abreOGrupo: indice === 0,
      });
    });
  }

  return andares;
}
