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

/**
 * O `alternates.languages` do metadata: diz ao buscador que estas URLs são a
 * mesma tela em idiomas diferentes, e qual servir a quem não pediu nenhum.
 *
 * Sai de `routing.locales`, então idioma novo entra aqui sozinho — é a mesma
 * regra do resto: acrescentar no routing basta.
 */
export function alternativasDeIdioma(caminho: string)
{
  const languages: Record<string, string> = {};

  for (const idioma of routing.locales)
  {
    languages[idioma] = getPathname({ href: caminho, locale: idioma });
  }

  // `x-default` é o que o buscador serve quando nenhum idioma casa.
  languages["x-default"] = getPathname({ href: caminho, locale: routing.defaultLocale });

  return { languages };
}
