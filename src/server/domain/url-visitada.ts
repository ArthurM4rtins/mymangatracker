/**
 * A URL da aba que o usuário está lendo, vinda da extensão (issue #52).
 *
 * Até aqui toda `ReadingProgress.resolvedUrl` nascia no servidor, aplicando o
 * template confirmado — client nenhum escolhia o que era gravado. A extensão
 * inverte isso: a URL é a página aberta, num site sem template. Como o app
 * mostra essa URL como link do histórico, o que passa por aqui vira `href`
 * depois, e a checagem mora no domínio para que nenhum chamador a contorne.
 *
 * Só http e https entram. `javascript:` e `data:` seriam XSS armazenado;
 * `chrome-extension:` e `file:` não são endereço que outro aparelho reabre.
 */

const ESQUEMAS = new Set(["http:", "https:"]);

/** Teto do que se guarda: URL de leitura real não chega perto disso. */
const TAMANHO_MAXIMO = 2048;

/**
 * A URL pronta para gravar, ou `null` quando não serve.
 *
 * @param valor - URL absoluta da aba, como a extensão mandou.
 */
export function normalizarUrlVisitada(valor: string): string | null
{
  const limpo = valor.trim();

  if (limpo === "" || limpo.length > TAMANHO_MAXIMO)
  {
    return null;
  }

  let url: URL;

  try
  {
    url = new URL(limpo);
  }
  catch
  {
    return null;
  }

  if (!ESQUEMAS.has(url.protocol) || url.host === "")
  {
    return null;
  }

  // Credencial embutida iria para o banco e para o log em texto puro.
  if (url.username !== "" || url.password !== "")
  {
    return null;
  }

  return url.toString();
}
