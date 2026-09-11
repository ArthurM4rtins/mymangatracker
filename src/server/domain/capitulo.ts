/**
 * O contrato do número do capítulo, num lugar só.
 *
 * `ReadingProgress.chapter` é `Decimal(8, 2)` positivo, e capítulo decimal
 * existe: 57.5 é capítulo de verdade. O número chega de origens diferentes — o
 * título da aba lido pela extensão, o campo que o usuário digitou no popup — e
 * todas passam por aqui, para o teto da coluna não viver copiado em dois
 * arquivos que depois divergem.
 */

const CASAS_DECIMAIS = 2;
const CAPITULO_MAXIMO = 999999.99;

/**
 * O capítulo pronto para gravar, arredondado às casas que a coluna guarda, ou
 * `null` quando está fora do contrato.
 */
export function normalizarCapitulo(valor: number): number | null
{
  if (!Number.isFinite(valor))
  {
    return null;
  }

  const fator = 10 ** CASAS_DECIMAIS;
  const capitulo = Math.round(valor * fator) / fator;

  if (capitulo <= 0 || capitulo > CAPITULO_MAXIMO)
  {
    return null;
  }

  return capitulo;
}
