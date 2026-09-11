/**
 * A forma de um código de idioma, e só a forma.
 *
 * Quais idiomas o site TEM é assunto da camada de apresentação
 * (`src/i18n/routing.ts`), que o domínio não conhece e nem deve. O que se checa
 * aqui é que a string parece um código BCP 47 — `pt-BR`, `en`, `zh-Hant` — em
 * vez de frase, caminho ou lixo.
 *
 * Por que existe: uma coluna `User.locale` com valor estranho faz o layout
 * devolver 404 no login seguinte da pessoa, e ela fica trancada fora da própria
 * conta. O controller valida contra a lista; isto é o cinto de segurança do
 * lado de quem grava.
 */

/** Subtag primária de 2 ou 3 letras, mais subtags alfanuméricas de 2 a 8. */
const FORMATO = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** O maior comprimento prático de uma tag BCP 47 bem-formada. */
const LIMITE = 35;

export function ehCodigoDeIdioma(valor: string): boolean
{
  return valor.length > 0 && valor.length <= LIMITE && FORMATO.test(valor);
}
