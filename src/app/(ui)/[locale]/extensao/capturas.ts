/**
 * De que idioma é a captura que cada leitor vê.
 *
 * O popup da extensão fala o idioma do NAVEGADOR (`_locales`, cinco catálogos),
 * não o do site. Então mostrar a mesma captura em português para todo mundo
 * entrega ao leitor justamente a língua que ele não vai ver na tela dele.
 *
 * Quem não tem captura no próprio idioma cai na primeira desta lista. Ela está
 * em ordem de preferência: assim que existir captura em inglês, `en` entra na
 * frente e vira a reserva — é o `default_locale` do manifest, o que aparece
 * para quem tem o navegador em qualquer idioma fora dos cinco.
 */
export const IDIOMAS_COM_CAPTURA = ["pt-BR"] as const;

/** O caminho da captura, no idioma do leitor quando existe. */
export function captura(nome: string, idioma: string): string
{
  return `/extensao/${nome}.${idiomaDaCaptura(idioma)}.png`;
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
