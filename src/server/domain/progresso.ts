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

const MARCADOR = "{chapter}";

/**
 * O tipo da fonte sai do próprio urlTemplate: com `{chapter}` o site carrega o
 * número do capítulo na URL; sem, guardamos a página da obra (MangaFire,
 * MangaDex e afins usam id opaco por capítulo) e quem navega até o capítulo é
 * o usuário — o registro continua igual.
 */
export function tipoDaFonte(urlTemplate: string): "template" | "pagina"
{
  return urlTemplate.includes(MARCADOR) ? "template" : "pagina";
}

/**
 * A URL absoluta da página da obra — fonte sem template.
 *
 * @throws quando o path carrega `{chapter}` (isso é template, não página).
 */
export function urlDaPagina(sourceHost: string, path: string): string
{
  if (tipoDaFonte(path) === "template")
  {
    throw new Error(`página da obra não leva ${MARCADOR}: ${path}`);
  }

  return `https://${sourceHost}${path}`;
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
