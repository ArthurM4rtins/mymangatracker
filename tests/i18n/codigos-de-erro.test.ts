import { describe, expect, it } from "vitest";

import { ERRO } from "@/app/api/v1/_shared/erros";

import en from "../../messages/en.json";
import ptBR from "../../messages/pt-BR.json";

/**
 * O servidor responde código de erro, não frase. Um código sem tradução chega
 * na tela como código cru — `lista_nao_encontrada` na cara do usuário. Aqui os
 * dois lados do contrato são cobrados um contra o outro.
 */
const CODIGOS = Object.values(ERRO).sort();

const CATALOGOS = [
  ["pt-BR", ptBR.erros as Record<string, string>],
  ["en", en.erros as Record<string, string>],
] as const;

describe("códigos de erro da API", () => {
  it("não tem código repetido com nome diferente", () => {
    expect(new Set(CODIGOS).size).toBe(CODIGOS.length);
  });

  it("usa snake_case", () => {
    const fora = CODIGOS.filter((codigo) => !/^[a-z][a-z0-9_]*$/.test(codigo));

    expect(fora).toEqual([]);
  });

  it.each(CATALOGOS)("tem frase para todo código em %s", (_idioma, catalogo) => {
    const semTraducao = CODIGOS.filter((codigo) => catalogo[codigo] === undefined);

    expect(semTraducao).toEqual([]);
  });

  it.each(CATALOGOS)("não guarda frase de código que não existe em %s", (_idioma, catalogo) => {
    const orfas = Object.keys(catalogo).filter(
      (chave) => !CODIGOS.includes(chave as (typeof CODIGOS)[number]),
    );

    expect(orfas).toEqual([]);
  });
});
