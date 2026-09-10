/**
 * De que idioma é a captura que cada leitor vê.
 *
 * O popup da extensão fala o idioma do NAVEGADOR (`_locales`, cinco catálogos),
 * não o do site. Mostrar a mesma captura para todo mundo entregaria ao leitor
 * de fora justamente a língua que ele não vai ver na tela dele.
 *
 * Quem não tem captura no próprio idioma cai na PRIMEIRA desta lista, que está
 * em ordem de preferência. O inglês vem na frente porque é o `default_locale`
 * do manifest: é o que aparece para quem tem o navegador em qualquer idioma
 * fora dos cinco, ou seja, para a maioria de quem não lê em português.
 *
 * A lista não cresce junto com os idiomas do site de propósito, e hoje tem um
 * item só. Captura custa idiomas × telas, e o custo volta a cada mudança de
 * visual do popup — enquanto o que a imagem mostra é ONDE as coisas ficam, e o
 * que cada uma faz já está escrito no idioma de quem lê, no texto e na legenda.
 * Manter a interface numa língua só, com o texto ao redor traduzido, é o que a
 * maioria dos produtos faz.
 */
export const IDIOMAS_COM_CAPTURA = ["en"] as const;

/**
 * O tamanho real de cada arquivo. Muda com o idioma — o mesmo popup fica alguns
 * pixels mais alto em português —, e `next/image` precisa do tamanho certo para
 * reservar o espaço antes de a imagem chegar.
 */
const TAMANHOS: Record<string, Record<string, { largura: number; altura: number }>> = {
  "popup-em-uso": {
    "en": { largura: 398, altura: 680 },
  },
  "popup-sem-sessao": {
    "en": { largura: 401, altura: 125 },
  },
};

export type Captura = { src: string; largura: number; altura: number };

/** A captura no idioma do leitor quando existe; senão, a da reserva. */
export function captura(nome: string, idioma: string): Captura
{
  const escolhido = idiomaDaCaptura(idioma);

  return { src: `/extensao/${nome}.${escolhido}.png`, ...TAMANHOS[nome][escolhido] };
}

/** Verdadeiro quando o leitor vai ver a extensão num idioma diferente do da captura. */
export function capturaEmOutroIdioma(idioma: string): boolean
{
  return idiomaDaCaptura(idioma) !== idioma;
}

function idiomaDaCaptura(idioma: string): string
{
  return IDIOMAS_COM_CAPTURA.some(function (com) { return com === idioma; })
    ? idioma
    : IDIOMAS_COM_CAPTURA[0];
}
