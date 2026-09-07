import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ERRO } from "@/app/api/v1/_shared/erros";
import { routing } from "@/i18n/routing";

/**
 * A extensão tem catálogo próprio (`_locales/` do Chrome, D9 da #116), então
 * ela quebra sozinha: chave que só existe num idioma vira string vazia no
 * popup, e código de erro que ela não conhece vira frase genérica onde deveria
 * haver frase específica. Aqui os dois lados são cobrados.
 *
 * Os idiomas saem de `routing.locales`, os mesmos do site — acrescentar um lá
 * passa a cobrar a pasta `_locales/` dele aqui, em vez de a extensão ficar para
 * trás em silêncio.
 */
type Mensagem = { message: string; placeholders?: Record<string, { content: string }> };

/** O Chrome escreve a pasta com underline: `pt-BR` vira `pt_BR`. */
function pastaDoChrome(idioma: string): string {
  return idioma.replace("-", "_");
}

function catalogo(idioma: string): Record<string, Mensagem> {
  return JSON.parse(
    readFileSync(`extension/_locales/${pastaDoChrome(idioma)}/messages.json`, "utf8"),
  );
}

function fonte(arquivo: string): string {
  return readFileSync(`extension/${arquivo}`, "utf8");
}

const CATALOGOS = routing.locales.map((idioma) => [idioma, catalogo(idioma)] as const);
const REFERENCIA = catalogo(routing.defaultLocale);

const MANIFEST = JSON.parse(fonte("manifest.json")) as {
  default_locale: string;
  name: string;
  description: string;
  action: { default_title: string };
};

/** Os nomes que o código pede ao `chrome.i18n`, e os que o HTML marca. */
function nomesUsados(): string[] {
  const codigo = fonte("popup.js") + fonte("i18n.js");
  const html = fonte("popup.html");
  const nomes = new Set<string>();

  for (const achado of codigo.matchAll(/KIDOKU_I18N\.texto\(\s*"([a-zA-Z]+)"/g)) {
    nomes.add(achado[1]);
  }
  for (const achado of html.matchAll(/data-i18n(?:-placeholder)?="([a-zA-Z]+)"/g)) {
    nomes.add(achado[1]);
  }
  // O ternário de `capituloLido`/`capituloNaoLido` e o `erroPadrao` do fallback
  // não aparecem como literal na chamada.
  for (const nome of ["capituloLido", "capituloNaoLido", "erroPadrao"]) {
    nomes.add(nome);
  }

  return [...nomes].sort();
}

/** Os códigos de erro que a extensão sabe traduzir, lidos do próprio i18n.js. */
function codigosMapeados(): string[] {
  const bloco = fonte("i18n.js").match(/FRASE_DO_ERRO\s*=\s*\{([^}]*)\}/);

  if (bloco === null) {
    throw new Error("extension/i18n.js nao declara FRASE_DO_ERRO");
  }

  return [...bloco[1].matchAll(/([a-z_]+)\s*:/g)].map((achado) => achado[1]).sort();
}

const CODIGOS_DA_API: string[] = Object.values(ERRO);

describe("catálogos da extensão", () => {
  it("usa o mesmo idioma padrão do site", () => {
    expect(MANIFEST.default_locale).toBe(pastaDoChrome(routing.defaultLocale));
  });

  it("tem uma pasta `_locales` para cada idioma do routing", () => {
    expect(CATALOGOS.length).toBe(routing.locales.length);
  });

  it("tira nome, descrição e título do catálogo", () => {
    expect(MANIFEST.name).toBe("__MSG_nome__");
    expect(MANIFEST.description).toBe("__MSG_descricao__");
    expect(MANIFEST.action.default_title).toBe("__MSG_acaoTitulo__");
  });

  it.each(CATALOGOS)("tem as mesmas chaves da referência em %s", (_idioma, catalogo) => {
    expect(Object.keys(catalogo).sort()).toEqual(Object.keys(REFERENCIA).sort());
  });

  it.each(CATALOGOS)("não tem mensagem vazia em %s", (_idioma, catalogo) => {
    const vazias = Object.entries(catalogo)
      .filter(([, valor]) => valor.message.trim() === "")
      .map(([chave]) => chave);

    expect(vazias).toEqual([]);
  });

  it.each(CATALOGOS)("mantém os placeholders da referência em %s", (_idioma, catalogo) => {
    const divergentes = Object.keys(REFERENCIA).filter((chave) => {
      const naReferencia = Object.keys(REFERENCIA[chave].placeholders ?? {}).sort();
      const aqui = Object.keys(catalogo[chave]?.placeholders ?? {}).sort();

      return naReferencia.join("|") !== aqui.join("|");
    });

    expect(divergentes).toEqual([]);
  });

  it.each(CATALOGOS)("tem frase para todo nome que o popup pede em %s", (_idioma, catalogo) => {
    const semFrase = nomesUsados().filter((nome) => catalogo[nome] === undefined);

    expect(semFrase).toEqual([]);
  });

  it("só mapeia código de erro que a API pode responder", () => {
    const inventados = codigosMapeados().filter((codigo) => !CODIGOS_DA_API.includes(codigo));

    expect(inventados).toEqual([]);
  });
});
