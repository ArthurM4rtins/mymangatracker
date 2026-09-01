/**
 * As regras do progresso de leitura.
 *
 * Progresso é o MAIOR capítulo aberto — não o último, não contagem de
 * aberturas. Releitura entra no histórico mas nunca regride a estante.
 */
import { aplicarTemplate } from "./url-template";

/** O capítulo que o botão "Continuar" oferece: o inteiro seguinte ao maior lido. */
export function proximoCapitulo(maiorLido: number | null): number
{
  if (maiorLido === null)
  {
    return 1;
  }

  return Math.floor(maiorLido) + 1;
}

/** Abrir `aberto` deve avançar o progresso da estante? Só quando é maior. */
export function progrideEstante(atual: number | null, aberto: number): boolean
{
  return aberto > (atual ?? 0);
}

/**
 * A URL absoluta do capítulo na fonte. O template guardado é o path com
 * `{chapter}`; o host vive separado em `sourceHost`.
 *
 * @throws quando o template não tem `{chapter}` ou o capítulo não é positivo.
 */
export function urlDaLeitura(
  sourceHost: string,
  urlTemplate: string,
  capitulo: number,
): string
{
  return `https://${sourceHost}${aplicarTemplate(urlTemplate, capitulo)}`;
}
