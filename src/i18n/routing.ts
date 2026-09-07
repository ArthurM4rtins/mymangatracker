import { hasLocale } from "next-intl";
import { defineRouting } from "next-intl/routing";

/**
 * Prefixo sempre na URL (`/pt-BR/obra/30002`, `/en/obra/30002`): toda tela
 * declara o idioma, link compartilhado carrega o idioma, cache e SEO não
 * misturam. `en` é o fallback de quem chega sem preferência reconhecida —
 * `pt` e `pt-PT` caem em `pt-BR` pela negociação do `Accept-Language`.
 */
export const routing = defineRouting({
  locales: ["pt-BR", "en", "es"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Idioma = (typeof routing.locales)[number];

/**
 * Categorias de plural do CLDR que este projeto dobra em `other`, por idioma,
 * com o motivo escrito.
 *
 * O CLDR exige mais formas do que a gente costuma escrever: pt-BR e es pedem
 * `many`, russo pede `few` e `many`, árabe pede seis. O teste de mensagens
 * cobra essas formas — e é isso que impede alguém copiar o `one`/`other` do
 * inglês para um idioma que precisa de mais e passar no CI com a tela errada.
 *
 * Dobrar uma categoria em `other` é uma decisão consciente, não um esquecimento:
 * ela só é legítima quando a palavra tem a MESMA forma nas duas categorias.
 * Quem acrescentar um idioma escreve todas as formas, ou registra aqui por quê
 * não precisou.
 */
export const PLURAL_DOBRADO_EM_OUTRO: Partial<Record<Idioma, readonly string[]>> = {
  // `many` em português só vale para 1e6 e acima ("1 milhão de obras"), e o
  // substantivo tem a mesma forma de `other` — "2 obras", "1000000 obras".
  "pt-BR": ["many"],
  // Espanhol é o mesmo caso do português: `many` é a categoria de 1e6 e acima
  // ("un millón de obras"), e o substantivo não muda de forma.
  es: ["many"],
};

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
