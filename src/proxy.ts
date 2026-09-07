import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

/**
 * Redireciona quem chega sem idioma na URL (`/obra/30002`, links antigos) para
 * o idioma negociado por `Accept-Language`, e mantém o cookie `NEXT_LOCALE` em
 * dia. Next 16 renomeou `middleware` para `proxy`.
 */
export default createMiddleware(routing);

export const config = {
  // `/api/**` fica de fora: a API fala codigo, nao idioma. Caminho com extensao
  // tambem, senao o redirect bloqueia CSS, JS e imagem.
  //
  // O padrao TEM que ser literal aqui: o Next analisa `matcher` estaticamente e
  // IGNORA variavel — com a constante importada o proxy passou a redirecionar
  // ate /api/v1/health (visto ao vivo em 07/09). Quem cobra o conteudo dele e
  // tests/i18n/proxy-matcher.test.ts, que le este arquivo.
  //
  // A classe [.] no lugar de \. e de proposito: um nivel de escape a menos e
  // um jeito a menos de escrever o padrao errado sem o build reclamar.
  matcher: "/((?!api|_next|_vercel|.*[.].*).*)",
};
