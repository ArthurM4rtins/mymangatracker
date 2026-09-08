import { describe, expect, it } from "vitest";
import {
  casarObraPeloTitulo,
  nomeDaObraNoTitulo,
  normalizarNomeDeObra,
  pedacosDoTitulo,
} from "@/server/domain/obra-do-titulo";

// A extensão (#171) tira do `document.title` não só o capítulo, mas o NOME da
// obra, e compara com a estante para pré-selecionar. Errar aqui só pré-seleciona
// a obra errada, visível para a pessoa corrigir antes de clicar — por isso o
// casamento pode ser aproximado. O que NÃO pode é casar duas: empate é `null`.
//
// Espelhado em `extension/comum.js`, como a regex de capítulo.

describe("pedacosDoTitulo", function ()
{
  it("MangaDex: tira o número da página e o capítulo; sobram obra e site", function ()
  {
    // O maior é o SITE, não a obra. É por isso que o casamento testa todos.
    expect(pedacosDoTitulo("1 | Chapter 68 - Berserk - MangaDex")).toEqual(["MangaDex", "Berserk"]);
  });

  it("MangaFire: tira o capítulo", function ()
  {
    expect(pedacosDoTitulo("Vagabond - Chapter 70")).toEqual(["Vagabond"]);
  });

  it("título sem nada útil é vazio", function ()
  {
    expect(pedacosDoTitulo("Chapter 2")).toEqual([]);
    expect(pedacosDoTitulo("")).toEqual([]);
  });
});

describe("nomeDaObraNoTitulo", function ()
{
  it("é o maior pedaço — o que a chave de pareamento usa", function ()
  {
    expect(nomeDaObraNoTitulo("Vagabond - Chapter 70")).toBe("Vagabond");
    expect(nomeDaObraNoTitulo("Chapter 2")).toBeNull();
  });
});

describe("normalizarNomeDeObra", function ()
{
  it("minúsculas, sem acento, sem pontuação, sem ano", function ()
  {
    expect(normalizarNomeDeObra("Berserk (2016)")).toBe("berserk");
    expect(normalizarNomeDeObra("Kingdom — 킹덤")).toBe("kingdom 킹덤");
    expect(normalizarNomeDeObra("  Vinland  Saga!  ")).toBe("vinland saga");
    expect(normalizarNomeDeObra("Cavaleiros do Zodíaco")).toBe("cavaleiros do zodiaco");
  });
});

const ESTANTE = [
  { entradaId: "e1", titulos: ["Berserk", null, "ベルセルク"] },
  { entradaId: "e2", titulos: ["Vagabond", "Vagabond", "バガボンド"] },
  { entradaId: "e3", titulos: ["Kingdom", null, "キングダム"] },
];

describe("casarObraPeloTitulo", function ()
{
  it("casa pelo romaji", function ()
  {
    expect(casarObraPeloTitulo("Vagabond - Chapter 70", ESTANTE)).toBe("e2");
  });

  it("casa pelo título nativo — o caso do site em outra língua", function ()
  {
    expect(casarObraPeloTitulo("ベルセルク 第68話 - MangaDex", ESTANTE)).toBe("e1");
  });

  it("ignora maiúscula, acento e ano", function ()
  {
    expect(casarObraPeloTitulo("Chapter 5 - BERSERK (2016)", ESTANTE)).toBe("e1");
  });

  it("nome que não está na estante é null", function ()
  {
    expect(casarObraPeloTitulo("Chapter 5 - One Piece", ESTANTE)).toBeNull();
  });

  it("empate não escolhe: duas obras com o mesmo nome normalizado", function ()
  {
    const duplicada = [
      { entradaId: "a", titulos: ["Kingdom", null, null] },
      { entradaId: "b", titulos: ["Kingdom (2021)", null, null] },
    ];

    expect(casarObraPeloTitulo("Kingdom - Chapter 1", duplicada)).toBeNull();
  });

  it("título sem nome útil é null, sem consultar nada", function ()
  {
    expect(casarObraPeloTitulo("Chapter 2", ESTANTE)).toBeNull();
  });
});
