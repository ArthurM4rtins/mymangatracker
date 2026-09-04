/**
 * Extração do número do capítulo a partir do título da aba.
 *
 * A extensão de navegador (issue #52) não lê DOM nem faz requisição ao site de
 * leitura: lê o `document.title`, que é a superfície de SEO da página e muda bem
 * menos que o markup. Nos dois sites em que a URL é opaca — MangaFire
 * (`/chapter/4745884`) e MangaDex (`/chapter/<uuid>`) — o título entrega o
 * capítulo.
 *
 * Só existe capítulo quando um marcador anuncia o número. Número solto vira
 * `null`: em "Vagabond 2" o 2 pode ser temporada, volume ou parte, e chutar aqui
 * gravaria progresso errado. Ausência de capítulo é resposta legítima — o popup
 * mostra o campo vazio e o usuário digita.
 */

/**
 * Marcadores que anunciam o número, do mais longo para o mais curto: a
 * alternância é tentada nessa ordem, e "cap" antes de "capítulo" faria o
 * marcador longo nunca casar.
 */
const CAPITULO = /\b(?:chapters?|chap|cap[íi]tulos?|caps?|ch)\b\.?\s*#?\s*(\d+(?:[.,]\d+)?)/i;

/** `ReadingProgress.chapter` é `Decimal(8, 2)`. */
const CASAS_DECIMAIS = 2;
const CAPITULO_MAXIMO = 999999.99;

/**
 * O capítulo anunciado no título, ou `null` quando o título não diz qual é.
 *
 * @param titulo - `document.title` da aba, como veio.
 */
export function capituloDoTitulo(titulo: string): number | null
{
  const encontrado = CAPITULO.exec(titulo);

  if (encontrado === null)
  {
    return null;
  }

  const numero = Number(encontrado[1].replace(",", "."));

  if (!Number.isFinite(numero))
  {
    return null;
  }

  const capitulo = arredondar(numero);

  if (capitulo <= 0 || capitulo > CAPITULO_MAXIMO)
  {
    return null;
  }

  return capitulo;
}

function arredondar(valor: number): number
{
  const fator = 10 ** CASAS_DECIMAIS;

  return Math.round(valor * fator) / fator;
}
