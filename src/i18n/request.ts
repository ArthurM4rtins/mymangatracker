import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

/**
 * Configuração por requisição: resolve o idioma do segmento `[locale]` e
 * carrega o catálogo dele. Segmento inválido (`/xx/obra/1`) cai no padrão em
 * vez de estourar — o `[locale]` funciona como catch-all de rota desconhecida.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const pedido = await requestLocale;
  const locale = hasLocale(routing.locales, pedido)
    ? pedido
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
