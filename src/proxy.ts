import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

/**
 * Redireciona quem chega sem idioma na URL (`/obra/30002`, links antigos) para
 * o idioma negociado por `Accept-Language`, e mantém o cookie `NEXT_LOCALE` em
 * dia. Next 16 renomeou `middleware` para `proxy`.
 */
export default createMiddleware(routing);

export const config = {
  // `/api/**` fica de fora: a API fala código, não idioma. Estático e arquivo
  // com extensão também, senão o redirect bloqueia CSS, JS e imagem.
  matcher: "/((?!api|_next|_vercel|.*\..*).*)",
};
