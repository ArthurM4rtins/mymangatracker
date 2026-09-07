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
