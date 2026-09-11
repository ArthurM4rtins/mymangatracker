/**
 * Rodízio de autoria nos trilhos públicos (issue #144).
 *
 * A home e a página de listas ordenavam por data (ou por curtidas) e cortavam
 * no limite, sem olhar de quem era cada linha: bastava publicar seguido para
 * ocupar a vitrine inteira, e repostar de tempos em tempos para continuar
 * ocupando. Nem os limitadores de criação por hora resolvem isso — dentro da
 * própria cota a conta ainda enchia o trilho.
 *
 * A ordem que chega é a do ranking, e continua sendo: o rodízio só PULA o
 * excedente de quem já apareceu demais. Nunca reordena, nunca promove ninguém.
 * Quem chama busca mais linhas do que exibe, para o corte ter de onde repor.
 */
/** Duas linhas por conta em qualquer trilho público. Decisão de 09/09/2026. */
export const MAXIMO_POR_AUTOR = 2;

/**
 * Quantas vezes o limite exibido vale a pena buscar. Com duas por autor, quatro
 * vezes preenche o trilho sempre que houver metade do limite em autores
 * distintos — e é barato: são as mesmas linhas que a consulta já ordenava.
 */
export const FATOR_DE_BUSCA = 4;

/** Os `limite` primeiros itens, com no máximo `maximoPorAutor` de cada autor. */
export function noMaximoPorAutor<T>(
  itens: readonly T[],
  autorDe: (item: T) => string,
  maximoPorAutor: number,
  limite: number,
): T[]
{
  const escolhidos: T[] = [];
  const quantos = new Map<string, number>();

  for (const item of itens)
  {
    if (escolhidos.length >= limite)
    {
      break;
    }

    const autor = autorDe(item);
    const ja = quantos.get(autor) ?? 0;

    if (ja >= maximoPorAutor)
    {
      continue;
    }

    quantos.set(autor, ja + 1);
    escolhidos.push(item);
  }

  return escolhidos;
}
