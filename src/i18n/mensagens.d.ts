import type mensagens from "../../messages/pt-BR.json";

import type { routing } from "./routing";

/**
 * `messages/pt-BR.json` é a fonte de tipos: `t("chave.que.nao.existe")` não
 * compila, e o idioma só pode ser um dos declarados no `routing`.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof mensagens;
  }
}
