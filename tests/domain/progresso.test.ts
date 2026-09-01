import { describe, expect, it } from "vitest";
import {
  progrideEstante,
  proximoCapitulo,
  urlDaLeitura,
} from "@/server/domain/progresso";

// As regras da issue #23: progresso é o MAIOR capítulo aberto — releitura
// registra histórico mas não regride a estante. Próximo capítulo é o inteiro
// seguinte ao maior (57.5 lido → próximo é 58). Capítulo decimal existe.

describe("proximoCapitulo", function ()
{
  it("sem progresso, começa no capítulo 1", function ()
  {
    expect(proximoCapitulo(null)).toBe(1);
  });

  it("segue para o inteiro seguinte", function ()
  {
    expect(proximoCapitulo(57)).toBe(58);
  });

  it("meio capítulo lido aponta para o inteiro seguinte", function ()
  {
    expect(proximoCapitulo(57.5)).toBe(58);
  });
});

describe("progrideEstante", function ()
{
  it("primeiro capítulo sempre progride", function ()
  {
    expect(progrideEstante(null, 1)).toBe(true);
  });

  it("capítulo maior progride", function ()
  {
    expect(progrideEstante(57, 57.5)).toBe(true);
  });

  it("releitura de capítulo antigo não regride", function ()
  {
    expect(progrideEstante(57, 30)).toBe(false);
  });

  it("abrir o mesmo capítulo não muda nada", function ()
  {
    expect(progrideEstante(57, 57)).toBe(false);
  });
});

describe("urlDaLeitura", function ()
{
  it("monta a URL absoluta com o capítulo no lugar do marcador", function ()
  {
    expect(
      urlDaLeitura("mangalivre.blog", "/title/Lookism/chapter/{chapter}/1", 57.5),
    ).toBe("https://mangalivre.blog/title/Lookism/chapter/57.5/1");
  });

  it("recusa template sem marcador", function ()
  {
    expect(function ()
    {
      urlDaLeitura("mangalivre.blog", "/title/Lookism/chapter/2/1", 3);
    }).toThrowError();
  });

  it("recusa capítulo não positivo", function ()
  {
    expect(function ()
    {
      urlDaLeitura("mangalivre.blog", "/c/{chapter}", 0);
    }).toThrowError();
  });
});
