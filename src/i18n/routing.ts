import { hasLocale } from "next-intl";
import { defineRouting } from "next-intl/routing";

/**
 * Prefixo sempre na URL (`/pt-BR/obra/30002`, `/en/obra/30002`): toda tela
 * declara o idioma, link compartilhado carrega o idioma, cache e SEO não
 * misturam. `en` é o fallback de quem chega sem preferência reconhecida —
 * `pt` e `pt-PT` caem em `pt-BR` pela negociação do `Accept-Language`.
 */
export const routing = defineRouting({
  locales: ["pt-BR", "en"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Idioma = (typeof routing.locales)[number];

/**
 * O idioma que o segmento `[locale]` carrega. `[locale]` casa qualquer rota
 * desconhecida (`/xx/obra/1`, `/robots.txt`), entao segmento invalido cai no
 * padrao em vez de estourar. O layout ainda devolve 404 nesse caso; aqui e so
 * para o `generateMetadata`, que roda antes dele.
 */
export function idiomaDoSegmento(segmento: string): Idioma
{
  return hasLocale(routing.locales, segmento) ? segmento : routing.defaultLocale;
}
