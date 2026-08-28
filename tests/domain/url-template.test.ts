import { describe, expect, it } from "vitest";
import { aplicarTemplate, derivarCandidatos } from "@/server/domain/url-template";

describe("derivarCandidatos", () =>
{
  it("ranqueia o segmento que vem logo depois de `chapter` quando há dois candidatos", () =>
  {
    const candidatos = derivarCandidatos(
      "https://asuracomic.net/title/Lookism/chapter/1/1",
    );

    expect(candidatos).toHaveLength(2);
    expect(candidatos[0]).toEqual({
      sourceHost: "asuracomic.net",
      urlTemplate: "/title/Lookism/chapter/{chapter}/1",
      segmentIndex: 3,
    });
    expect(candidatos[1]).toEqual({
      sourceHost: "asuracomic.net",
      urlTemplate: "/title/Lookism/chapter/1/{chapter}",
      segmentIndex: 4,
    });
  });

  it("reconhece `cap` como marcador de capítulo", () =>
  {
    const candidatos = derivarCandidatos(
      "https://site.com/manga/Solo-Leveling/cap/1",
    );

    expect(candidatos).toHaveLength(1);
    expect(candidatos[0].urlTemplate).toBe("/manga/Solo-Leveling/cap/{chapter}");
    expect(candidatos[0].segmentIndex).toBe(3);
  });

  it("reconhece `ch` e coloca o candidato do capítulo à frente do da página", () =>
  {
    const candidatos = derivarCandidatos("https://site.com/read/ch/1/page/1");

    expect(candidatos.map(function (c) { return c.segmentIndex; })).toEqual([2, 4]);
    expect(candidatos[0].urlTemplate).toBe("/read/ch/{chapter}/page/1");
  });

  it("sem marcador, mantém a ordem dos segmentos", () =>
  {
    const candidatos = derivarCandidatos("https://site.com/a/1/b/1");

    expect(candidatos.map(function (c) { return c.segmentIndex; })).toEqual([1, 3]);
  });

  it("devolve lista vazia quando nenhum segmento vale 1", () =>
  {
    expect(derivarCandidatos("https://site.com/manga/Lookism")).toEqual([]);
  });

  it("não confunde `chapter-1` com um segmento cujo valor é 1", () =>
  {
    expect(derivarCandidatos("https://site.com/manga/Lookism/chapter-1")).toEqual([]);
  });

  it("não procura candidatos na query string", () =>
  {
    const candidatos = derivarCandidatos("https://site.com/ler?cap=1&modo=vertical");

    expect(candidatos).toHaveLength(0);
  });

  it("recusa URL sem host", () =>
  {
    expect(() => derivarCandidatos("/title/Lookism/chapter/1/1")).toThrow(
      /URL inválida/,
    );
  });
});

describe("aplicarTemplate", () =>
{
  it("monta o link do capítulo pedido", () =>
  {
    expect(
      aplicarTemplate("/title/Lookism/chapter/{chapter}/1", 2),
    ).toBe("/title/Lookism/chapter/2/1");
  });

  it("preserva capítulo decimal", () =>
  {
    expect(
      aplicarTemplate("/title/Lookism/chapter/{chapter}/1", 57.5),
    ).toBe("/title/Lookism/chapter/57.5/1");
  });

  it("recusa template sem o marcador", () =>
  {
    expect(() => aplicarTemplate("/title/Lookism/chapter/1/1", 2)).toThrow(
      /\{chapter\}/,
    );
  });

  it("recusa capítulo que não é positivo", () =>
  {
    expect(() => aplicarTemplate("/c/{chapter}", 0)).toThrow(/positivo/);
  });
});
