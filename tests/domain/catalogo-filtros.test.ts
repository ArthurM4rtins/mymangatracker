import { describe, expect, it } from "vitest";
import {
  GENEROS,
  interpretarFiltros,
  temFiltroAtivo,
} from "@/server/domain/catalogo-filtros";

// As regras da issue #37: filtro vem da URL, então TUDO passa por whitelist —
// valor desconhecido é descartado em silêncio, nunca erro nem repasse cru.

describe("interpretarFiltros", function ()
{
  it("aceita filtros válidos", function ()
  {
    expect(
      interpretarFiltros({
        q: " berserk ",
        tipo: "manhwa",
        genero: "Action",
        decada: "1990",
        ordem: "nota",
      }),
    ).toEqual({
      termo: "berserk",
      tipo: "manhwa",
      genero: "Action",
      decada: 1990,
      ordem: "nota",
    });
  });

  it("descarta o que não está na whitelist e assume a ordem padrão", function ()
  {
    expect(
      interpretarFiltros({
        tipo: "anime",
        genero: "NãoExiste",
        decada: "1875",
        ordem: "hack",
      }),
    ).toEqual({ termo: "", ordem: "popular" });
  });

  it("sem nada, é o filtro vazio", function ()
  {
    expect(interpretarFiltros({})).toEqual({ termo: "", ordem: "popular" });
  });
});

describe("temFiltroAtivo", function ()
{
  it("termo sozinho não conta como filtro", function ()
  {
    expect(temFiltroAtivo(interpretarFiltros({ q: "berserk" }))).toBe(false);
  });

  it("qualquer tipo, gênero, década ou ordem não-padrão conta", function ()
  {
    expect(temFiltroAtivo(interpretarFiltros({ tipo: "novel" }))).toBe(true);
    expect(temFiltroAtivo(interpretarFiltros({ genero: "Drama" }))).toBe(true);
    expect(temFiltroAtivo(interpretarFiltros({ decada: "2010" }))).toBe(true);
    expect(temFiltroAtivo(interpretarFiltros({ ordem: "alta" }))).toBe(true);
  });
});

describe("GENEROS", function ()
{
  it("é a lista fixa do AniList, com os clássicos presentes", function ()
  {
    expect(GENEROS).toContain("Action");
    expect(GENEROS).toContain("Romance");
    expect(GENEROS).toContain("Slice of Life");
  });
});
