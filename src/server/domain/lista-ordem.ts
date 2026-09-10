/**
 * Reordenar itens de uma lista (issue #51). A ordem proposta tem que ser
 * permutação exata dos itens atuais: sem faltar, sem sobrar, sem repetir —
 * senão o pedido é inválido e nada é gravado. `mover` é a regra pura que a
 * tela usa pra montar a proposta a partir de uma seta.
 */

export function mesmoConjunto<T>(atual: ReadonlyArray<T>, proposto: ReadonlyArray<T>): boolean
{
  if (atual.length !== proposto.length)
  {
    return false;
  }

  const restantes = new Set(atual);

  if (restantes.size !== atual.length)
  {
    return false;
  }

  for (const item of proposto)
  {
    if (!restantes.delete(item))
    {
      return false;
    }
  }

  return restantes.size === 0;
}

export type Direcao = "cima" | "baixo";

/** Troca o item com o vizinho na direção pedida. Ponta ou desconhecido = mesma ordem. */
export function mover<T>(ordem: ReadonlyArray<T>, item: T, direcao: Direcao): T[]
{
  const copia = [...ordem];
  const indice = copia.indexOf(item);
  const destino = direcao === "cima" ? indice - 1 : indice + 1;

  if (indice === -1 || destino < 0 || destino >= copia.length)
  {
    return copia;
  }

  [copia[indice], copia[destino]] = [copia[destino], copia[indice]];

  return copia;
}

/**
 * Leva o item para uma posição qualquer (#242): é o que o arraste precisa, e a
 * seta não dá, porque ela só troca com o vizinho.
 *
 * `destino` é o índice que o item passa a ocupar na ordem FINAL, contado depois
 * de tirá-lo da origem. É essa contagem que faz a vaga aberta durante o arraste
 * ser a mesma posição que se grava — contar sobre a ordem original erraria por
 * um sempre que o item anda para a direita.
 *
 * Destino fora da faixa gruda na ponta em vez de sumir com o item: um ponteiro
 * fora da prateleira não pode encurtar a lista.
 */
export function reposicionar<T>(ordem: ReadonlyArray<T>, item: T, destino: number): T[]
{
  const copia = [...ordem];
  const indice = copia.indexOf(item);

  if (indice === -1)
  {
    return copia;
  }

  copia.splice(indice, 1);
  copia.splice(Math.max(0, Math.min(copia.length, destino)), 0, item);

  return copia;
}
