/**
 * Guarda contra CSRF nas rotas que GRAVAM cookie sem exigir cookie: login e
 * cadastro (#131, achado 1 da auditoria). Um form auto-submetido em outro site
 * consegue fazer o navegador da vítima dar POST aqui; com `sameSite: "lax"` o
 * cookie novo é gravado, e a vítima passa a usar a conta do atacante.
 *
 * Camada de controller: lê cabeçalho, não regra de negócio. O serviço não sabe
 * que isso existe.
 */

/**
 * O pedido veio do próprio site (ou de fora de qualquer página, como um
 * `curl` ou a barra de endereço), e não de uma página de outro site.
 *
 * `sec-fetch-site` é a fonte confiável: o navegador o escreve e página nenhuma
 * o forja. `same-origin` é o site falando consigo; `none` é navegação iniciada
 * pela pessoa (barra, favorito) ou cliente que não é navegador. Sem ele —
 * navegador velho, `curl` — cai no `origin`: ausente ou igual ao nosso passa;
 * diferente é outro site.
 */
export function mesmaOrigem(request: Request): boolean
{
  const secFetchSite = request.headers.get("sec-fetch-site");

  if (secFetchSite !== null)
  {
    return secFetchSite === "same-origin" || secFetchSite === "none";
  }

  const origem = request.headers.get("origin");

  return origem === null || origem === new URL(request.url).origin;
}
