/**
 * As regras do progresso de leitura.
 *
 * Progresso é o MAIOR capítulo aberto — não o último, não contagem de
 * aberturas. Releitura entra no histórico mas nunca regride a estante.
 */
/**
 * Capítulo que o banco consegue guardar: finito, positivo e com no máximo
 * duas casas — a coluna é Decimal(8,2). Sem isto, 57.555 virava 57.56 em
 * silêncio no banco enquanto URL e resposta diziam 57.555.
 */
export function capituloValido(valor: number): boolean
{
  if (!Number.isFinite(valor) || valor <= 0)
  {
    return false;
  }

  const centesimos = valor * 100;

  return Math.abs(centesimos - Math.round(centesimos)) < 1e-6;
}

/** Abrir `aberto` deve avançar o progresso da estante? Só quando é maior. */
export function progrideEstante(atual: number | null, aberto: number): boolean
{
  return aberto > (atual ?? 0);
}

/**
 * O progresso atual da obra quando a estante foi editada à mão (#31) e o
 * histórico de aberturas diz outra coisa (#61): vale o MAIOR dos dois. Nenhum
 * dos lados regride o outro — marcar 100 à mão sem nunca ter aberto nada
 * continua sendo 100, e abrir o 58 depois de marcar 50 continua sendo 58.
 */
export function progressoAtual(
  marcadoNaEstante: number | null,
  maiorAberto: number | null,
): number | null
{
  if (marcadoNaEstante === null)
  {
    return maiorAberto;
  }

  if (maiorAberto === null)
  {
    return marcadoNaEstante;
  }

  return Math.max(marcadoNaEstante, maiorAberto);
}
