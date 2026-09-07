import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Navegação ciente do idioma. Substitui `next/link` e `next/navigation` na
 * camada de apresentação: `href="/catalogo"` vira `/pt-BR/catalogo` sozinho,
 * então nenhum link precisa carregar o prefixo à mão.
 *
 * `notFound` e `useSearchParams` continuam vindo de `next/navigation`: não
 * têm nada a ver com idioma.
 */
export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
