import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * O `matcher` do proxy é uma string que o Next compila como regex, e que ele
 * analisa ESTATICAMENTE — variável ali é ignorada em silêncio. Por isso o teste
 * lê o arquivo que embarca, e não uma cópia: a cópia poderia estar certa
 * enquanto o que roda está errado. Foi exatamente o que aconteceu em 07/09,
 * com `/api/v1/health` recebendo redirect de idioma.
 *
 * Escapar errado não quebra o build. Quebra em produção, em todo link antigo.
 */
function matcherDoProxy(): string
{
  const fonte = readFileSync("src/proxy.ts", "utf8");
  const declaracao = fonte.indexOf("matcher:");

  if (declaracao === -1)
  {
    throw new Error("src/proxy.ts nao declara `matcher:`");
  }

  const abre = fonte.indexOf('"', declaracao);
  const fecha = fonte.indexOf('"', abre + 1);

  if (abre === -1 || fecha === -1)
  {
    throw new Error("o `matcher` do proxy nao e uma string literal");
  }

  return fonte.slice(abre + 1, fecha);
}

const REGRA = new RegExp("^" + matcherDoProxy() + "$");

const NEGOCIA = [
  "/",
  "/catalogo",
  "/listas",
  "/obra/30002",
  "/u/nicholas",
  "/autor/95269",
  "/pt-BR/obra/30002",
  "/en/catalogo",
];

const FICA_FORA = [
  "/api/v1/health",
  "/api/v1/sessao",
  "/_next/static/chunks/main.js",
  "/_vercel/insights",
  "/favicon.ico",
  "/logo.png",
  "/globals.css",
];

describe("matcher do proxy", () => {
  it.each(NEGOCIA)("negocia idioma em %s", (caminho) => {
    expect(REGRA.test(caminho)).toBe(true);
  });

  it.each(FICA_FORA)("fica fora de %s", (caminho) => {
    expect(REGRA.test(caminho)).toBe(false);
  });
});
