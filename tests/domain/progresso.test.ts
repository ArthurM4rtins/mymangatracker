import { describe, expect, it } from "vitest";
import {
  progressoAtual,
  progrideEstante,
  proximoCapitulo,
  tipoDaFonte,
  urlDaLeitura,
  urlDaPagina,
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

describe("tipoDaFonte", function ()
{
  // Sites como MangaFire/MangaDex não carregam o número do capítulo na URL.
  // O discriminador é o próprio urlTemplate: com {chapter} abre o capítulo
  // direto; sem, a fonte é a página da obra.
  it("com marcador é template", function ()
  {
    expect(tipoDaFonte("/title/Lookism/chapter/{chapter}/1")).toBe("template");
  });

  it("sem marcador é página da obra", function ()
  {
    expect(tipoDaFonte("/title/4mx-vagabondd")).toBe("pagina");
  });
});

describe("urlDaPagina", function ()
{
  it("monta a URL absoluta da página da obra", function ()
  {
    expect(urlDaPagina("mangafire.to", "/title/4mx-vagabondd")).toBe(
      "https://mangafire.to/title/4mx-vagabondd",
    );
  });

  it("recusa path com marcador — isso é template, não página", function ()
  {
    expect(function ()
    {
      urlDaPagina("mangafire.to", "/title/x/{chapter}");
    }).toThrowError();
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

// Issue #61: desde a edição manual (#31), o capítulo marcado à mão na estante
// e o maior aberto no histórico podem divergir. O progresso atual é o MAIOR
// dos dois — nenhum deles regride o outro.
describe("progressoAtual", function ()
{
  it("sem edição manual nem histórico não há progresso", function ()
  {
    expect(progressoAtual(null, null)).toBeNull();
  });

  it("capítulo marcado à mão sozinho vale como progresso", function ()
  {
    expect(progressoAtual(100, null)).toBe(100);
  });

  it("histórico de abertura sozinho vale como progresso", function ()
  {
    expect(progressoAtual(null, 57.5)).toBe(57.5);
  });

  it("quando divergem, vale o maior — em qualquer ordem", function ()
  {
    expect(progressoAtual(100, 50)).toBe(100);
    expect(progressoAtual(50, 100)).toBe(100);
  });
});
