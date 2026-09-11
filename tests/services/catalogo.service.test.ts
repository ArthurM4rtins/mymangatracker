import { describe, expect, it, vi } from "vitest";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { interpretarFiltros } from "@/server/domain/catalogo-filtros";
import { lembrarPorTempo } from "@/server/domain/memoria-curta";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import {
  buscarNoCatalogo,
  OBRAS_POR_PAGINA,
  type PaginaDaFonte,
} from "@/server/services/catalogo.service";

// Issue #17: campo vazio é a vitrine de populares. Issue #37: com termo OU
// filtro ativo, a busca filtrada assume. AniList fora nunca vira 500.
// Issue #134: a vitrine é a mesma para todo visitante, então a composição de
// produção lembra a resposta por uma janela curta.

const OBRA: MediaDoAniList = {
  anilistId: 30013,
  type: "MANGA",
  titleRomaji: "Vinland Saga",
  countryOfOrigin: "JP",
  chapters: 224,
};

function fakeDeps()
{
  return {
    populares: vi.fn(async function (): Promise<MediaDoAniList[]> { return [OBRA]; }),
    filtrado: vi.fn(async function (): Promise<MediaDoAniList[]> { return [OBRA]; }),
    limitar: vi.fn(async function (): Promise<Veredito> { return { bloqueado: false }; }),
    doCache: vi.fn(async function (): Promise<MediaDoAniList[]> { return []; }),
    noKitsu: vi.fn(async function (): Promise<PaginaDaFonte> { return { obras: [], temMais: false }; }),
  };
}

describe("buscarNoCatalogo com termo ou filtro", function ()
{
  it("busca filtrada com o filtro inteiro e devolve ok", async function ()
  {
    const deps = fakeDeps();
    const filtro = interpretarFiltros({ q: "vinland", genero: "Action" });

    const resultado = await buscarNoCatalogo(filtro, deps);

    expect(deps.filtrado).toHaveBeenCalledWith(filtro, 1);
    expect(resultado).toEqual({ estado: "ok", termo: "vinland", obras: [OBRA], temMais: false });
    expect(deps.populares).not.toHaveBeenCalled();
  });

  it("filtro sem termo também é busca, não vitrine", async function ()
  {
    const deps = fakeDeps();

    const resultado = await buscarNoCatalogo(interpretarFiltros({ tipo: "manhwa" }), deps);

    expect(resultado.estado).toBe("ok");
    expect(deps.populares).not.toHaveBeenCalled();
  });

  it("devolve vazio quando a busca não encontra nada", async function ()
  {
    const deps = fakeDeps();
    deps.filtrado.mockResolvedValue([]);

    const resultado = await buscarNoCatalogo(interpretarFiltros({ q: "zzzzz" }), deps);

    expect(resultado).toEqual({ estado: "vazio", termo: "zzzzz" });
  });

  it("devolve indisponivel quando o AniList falha", async function ()
  {
    const deps = fakeDeps();
    deps.filtrado.mockRejectedValue(new Error("fora"));

    const resultado = await buscarNoCatalogo(interpretarFiltros({ q: "vinland" }), deps);

    expect(resultado).toEqual({ estado: "indisponivel", termo: "vinland" });
  });
});

describe("buscarNoCatalogo sem termo nem filtro", function ()
{
  it("devolve os populares como destaques", async function ()
  {
    const deps = fakeDeps();

    const resultado = await buscarNoCatalogo(interpretarFiltros({}), deps);

    expect(resultado).toEqual({ estado: "destaques", termo: "", obras: [OBRA], temMais: false });
    expect(deps.filtrado).not.toHaveBeenCalled();
  });

  it("devolve vazio quando os populares vêm vazios", async function ()
  {
    const deps = fakeDeps();
    deps.populares.mockResolvedValue([]);

    const resultado = await buscarNoCatalogo(interpretarFiltros({ q: "   " }), deps);

    expect(resultado).toEqual({ estado: "vazio", termo: "" });
  });

  it("devolve indisponivel quando o AniList falha", async function ()
  {
    const deps = fakeDeps();
    deps.populares.mockRejectedValue(new Error("fora"));

    const resultado = await buscarNoCatalogo(interpretarFiltros({}), deps);

    expect(resultado).toEqual({ estado: "indisponivel", termo: "" });
  });
});

// #134: `GET /` é force-dynamic e chamava o AniList em TODO render, do IP único
// do deploy. A query da vitrine é idêntica para todo visitante, então a mesma
// resposta serve a janela inteira.
describe("a vitrine lembrada", function ()
{
  it("uma ida só enquanto a janela vale, e outra depois dela", async function ()
  {
    const populares = vi.fn(async function () { return [OBRA]; });
    let instante = 0;
    const deps = {
      ...fakeDeps(),
      populares: lembrarPorTempo(populares, 30_000, function () { return instante; }),
    };

    await buscarNoCatalogo(interpretarFiltros({}), deps);
    instante = 29_999;
    await buscarNoCatalogo(interpretarFiltros({}), deps);

    expect(populares).toHaveBeenCalledTimes(1);

    instante = 30_001;
    await buscarNoCatalogo(interpretarFiltros({}), deps);

    expect(populares).toHaveBeenCalledTimes(2);
  });

  it("a busca filtrada não é lembrada: a chave é de quem pede", async function ()
  {
    const filtrado = vi.fn(async function () { return [OBRA]; });
    const deps = { ...fakeDeps(), filtrado };

    await buscarNoCatalogo(interpretarFiltros({ q: "a" }), deps);
    await buscarNoCatalogo(interpretarFiltros({ q: "b" }), deps);

    expect(filtrado).toHaveBeenCalledTimes(2);
  });
});

// #134: memo não defende a busca filtrada, porque a chave é o `?q=` de quem
// pede. Ali a defesa é orçamento por IP, e ele corre ANTES da ida ao AniList.
describe("teto por IP na busca filtrada", function ()
{
  it("acima do teto, devolve muitos_pedidos sem chamar o AniList", async function ()
  {
    const deps = {
      ...fakeDeps(),
      limitar: vi.fn(async function () { return { bloqueado: true as const, esperarSegundos: 30 }; }),
    };

    const resultado = await buscarNoCatalogo(interpretarFiltros({ q: "berserk" }), deps, "1.2.3.4");

    expect(resultado).toEqual({ estado: "muitos_pedidos", termo: "berserk" });
    expect(deps.filtrado).not.toHaveBeenCalled();
  });

  it("a vitrine não passa pelo teto: ela é lembrada, não custa ida", async function ()
  {
    const limitar = vi.fn(async function () { return { bloqueado: true as const, esperarSegundos: 30 }; });
    const deps = { ...fakeDeps(), limitar };

    const resultado = await buscarNoCatalogo(interpretarFiltros({}), deps, "1.2.3.4");

    expect(resultado.estado).toBe("destaques");
    expect(limitar).not.toHaveBeenCalled();
  });

  it("sem IP, não limita: a página que não passa IP é a que já era pública", async function ()
  {
    const limitar = vi.fn(async function () { return { bloqueado: true as const, esperarSegundos: 30 }; });
    const deps = { ...fakeDeps(), limitar };

    const resultado = await buscarNoCatalogo(interpretarFiltros({ q: "berserk" }), deps);

    expect(resultado.estado).toBe("ok");
    expect(limitar).not.toHaveBeenCalled();
  });
});

// #165: o AniList desligou a API em 08/09/2026 e o catalogo — a tela de entrada
// do produto — ficou vazio, mesmo com obras ja cacheadas no banco. O resto do
// sistema degrada com o cache; o catalogo era o unico caminho que ignorava o
// banco de proposito, decisao que fazia sentido quando o risco era o Postgres
// cair, e que inverteu de efeito quando quem caiu foi o terceiro.
describe("fallback para o cache quando o AniList cai", function ()
{
  function comAniListFora()
  {
    const deps = fakeDeps();
    deps.populares.mockRejectedValue(new Error("403 disabled"));
    deps.filtrado.mockRejectedValue(new Error("403 disabled"));
    return deps;
  }

  it("com obras no banco, devolve o cache em vez da tela vazia", async function ()
  {
    const doCache = vi.fn(async function () { return [OBRA]; });

    const resultado = await buscarNoCatalogo(
      interpretarFiltros({ q: "vinland" }),
      { ...comAniListFora(), doCache },
    );

    expect(resultado).toEqual({ estado: "cache", termo: "vinland", obras: [OBRA], temMais: false });
    expect(doCache).toHaveBeenCalledWith("vinland", 1);
  });

  it("a vitrine sem termo também cai no cache", async function ()
  {
    const doCache = vi.fn(async function () { return [OBRA]; });

    const resultado = await buscarNoCatalogo(
      interpretarFiltros({}),
      { ...comAniListFora(), doCache },
    );

    expect(resultado).toEqual({ estado: "cache", termo: "", obras: [OBRA], temMais: false });
  });

  it("banco vazio continua sendo indisponivel — o comportamento de hoje", async function ()
  {
    const doCache = vi.fn(async function (): Promise<typeof OBRA[]> { return []; });

    const resultado = await buscarNoCatalogo(
      interpretarFiltros({ q: "zzz" }),
      { ...comAniListFora(), doCache },
    );

    expect(resultado).toEqual({ estado: "indisponivel", termo: "zzz" });
  });

  it("o cache tambem falhando nao vira 500: segue indisponivel", async function ()
  {
    const doCache = vi.fn(async function (): Promise<typeof OBRA[]> { throw new Error("banco fora"); });

    const resultado = await buscarNoCatalogo(
      interpretarFiltros({ q: "zzz" }),
      { ...comAniListFora(), doCache },
    );

    expect(resultado).toEqual({ estado: "indisponivel", termo: "zzz" });
  });

  it("com o AniList de pe, o banco nem e consultado", async function ()
  {
    const doCache = vi.fn(async function () { return [OBRA]; });

    const resultado = await buscarNoCatalogo(
      interpretarFiltros({ q: "vinland" }),
      { ...fakeDeps(), doCache },
    );

    expect(resultado.estado).toBe("ok");
    expect(doCache).not.toHaveBeenCalled();
  });
});

// #219: o Kitsu tapa o buraco enquanto o AniList esta fora. Ele entra ANTES do
// cache local — o cache tem so o que alguem ja visitou; o Kitsu tem catalogo.
// E nunca entra com o AniList de pe: fallback, nao segunda fonte ao vivo.
describe("Kitsu como fallback do AniList", function ()
{
  function comAniListFora()
  {
    const deps = fakeDeps();
    deps.populares.mockRejectedValue(new Error("403 disabled"));
    deps.filtrado.mockRejectedValue(new Error("403 disabled"));
    return deps;
  }

  const OUTRA = { ...OBRA, anilistId: 30656, titleRomaji: "Vagabond" };

  it("com o AniList fora, responde do Kitsu", async function ()
  {
    const noKitsu = vi.fn(async function (): Promise<PaginaDaFonte> { return { obras: [OUTRA], temMais: false }; });

    const resultado = await buscarNoCatalogo(
      interpretarFiltros({ q: "vagabond" }),
      { ...comAniListFora(), noKitsu },
    );

    expect(resultado).toEqual({ estado: "kitsu", termo: "vagabond", obras: [OUTRA], temMais: false });
    expect(noKitsu).toHaveBeenCalledWith(interpretarFiltros({ q: "vagabond" }), 1);
  });

  it("com o AniList de pe, o Kitsu nem e consultado", async function ()
  {
    const noKitsu = vi.fn(async function (): Promise<PaginaDaFonte> { return { obras: [OUTRA], temMais: false }; });

    const resultado = await buscarNoCatalogo(
      interpretarFiltros({ q: "vinland" }),
      { ...fakeDeps(), noKitsu },
    );

    expect(resultado.estado).toBe("ok");
    expect(noKitsu).not.toHaveBeenCalled();
  });

  it("Kitsu vazio cai no cache local, que e o ultimo recurso", async function ()
  {
    const noKitsu = vi.fn(async function (): Promise<PaginaDaFonte> { return { obras: [], temMais: false }; });
    const doCache = vi.fn(async function () { return [OBRA]; });

    const resultado = await buscarNoCatalogo(
      interpretarFiltros({ q: "vinland" }),
      { ...comAniListFora(), noKitsu, doCache },
    );

    expect(resultado).toEqual({ estado: "cache", termo: "vinland", obras: [OBRA], temMais: false });
  });

  it("Kitsu falhando tambem cai no cache, sem virar 500", async function ()
  {
    const noKitsu = vi.fn(async function (): Promise<PaginaDaFonte> { throw new Error("kitsu fora"); });
    const doCache = vi.fn(async function () { return [OBRA]; });

    const resultado = await buscarNoCatalogo(
      interpretarFiltros({ q: "vinland" }),
      { ...comAniListFora(), noKitsu, doCache },
    );

    expect(resultado.estado).toBe("cache");
  });

  it("todos fora: indisponivel, como antes", async function ()
  {
    const resultado = await buscarNoCatalogo(
      interpretarFiltros({ q: "vinland" }),
      {
        ...comAniListFora(),
        noKitsu: vi.fn(async function (): Promise<PaginaDaFonte> { return { obras: [], temMais: false }; }),
        doCache: vi.fn(async function (): Promise<typeof OBRA[]> { return []; }),
      },
    );

    expect(resultado).toEqual({ estado: "indisponivel", termo: "vinland" });
  });
});

// Prateleiras com mais andares: a home mostra 36 populares em 4 andares, e o
// catalogo carrega mais paginas sob demanda. A pagina e' repassada as fontes;
// so a primeira pagina da vitrine e' lembrada, porque e' a unica igual para
// todo mundo.
describe("paginacao do catalogo", function ()
{
  it("repassa a pagina para a busca filtrada", async function ()
  {
    const deps = fakeDeps();
    const filtro = interpretarFiltros({ q: "vinland" });

    await buscarNoCatalogo(filtro, deps, undefined, 3);

    expect(deps.filtrado).toHaveBeenCalledWith(filtro, 3);
  });

  it("repassa a pagina para a vitrine", async function ()
  {
    const deps = fakeDeps();

    await buscarNoCatalogo(interpretarFiltros({}), deps, undefined, 2);

    expect(deps.populares).toHaveBeenCalledWith(2);
  });

  it("sem pagina, e' a primeira", async function ()
  {
    const deps = fakeDeps();

    await buscarNoCatalogo(interpretarFiltros({}), deps);

    expect(deps.populares).toHaveBeenCalledWith(1);
  });

  it("a pagina chega ao Kitsu e ao cache no fallback", async function ()
  {
    const deps = fakeDeps();
    deps.populares.mockRejectedValue(new Error("fora"));
    const noKitsu = vi.fn(async function (): Promise<PaginaDaFonte> { return { obras: [], temMais: false }; });
    const doCache = vi.fn(async function () { return [OBRA]; });

    await buscarNoCatalogo(interpretarFiltros({}), { ...deps, noKitsu, doCache }, undefined, 2);

    expect(noKitsu).toHaveBeenCalledWith(interpretarFiltros({}), 2);
    expect(doCache).toHaveBeenCalledWith("", 2);
  });
});


// #228: o "fim" do catálogo era a contagem do que sobrou depois do descarte
// (oneshot, oel, obra sem mapeamento para o AniList), não a resposta da fonte.
// Página curta virava "acabou" com 63 mil obras ainda por ver.
describe("temMais é resposta da fonte, não contagem do que sobrou", function ()
{
  const VITRINE = interpretarFiltros({});

  it("Kitsu com mais a dar: temMais verdadeiro mesmo com página curta", async function ()
  {
    const deps = fakeDeps();
    deps.populares.mockRejectedValue(new Error("anilist fora"));
    deps.noKitsu.mockResolvedValue({ obras: [OBRA], temMais: true });

    const resultado = await buscarNoCatalogo(VITRINE, deps);

    expect(resultado).toMatchObject({ estado: "kitsu", temMais: true });
  });

  it("Kitsu no fim do acervo: temMais falso", async function ()
  {
    const deps = fakeDeps();
    deps.populares.mockRejectedValue(new Error("anilist fora"));
    deps.noKitsu.mockResolvedValue({ obras: [OBRA], temMais: false });

    const resultado = await buscarNoCatalogo(VITRINE, deps, undefined, 9);

    expect(resultado).toMatchObject({ estado: "kitsu", temMais: false });
    expect(deps.noKitsu).toHaveBeenCalledWith(VITRINE, 9);
  });

  it("AniList de pé: página cheia diz que há mais", async function ()
  {
    const cheia = Array.from({ length: OBRAS_POR_PAGINA }, function (_, indice)
    {
      return { ...OBRA, anilistId: indice + 1 };
    });
    const deps = fakeDeps();
    deps.populares.mockResolvedValue(cheia);

    const resultado = await buscarNoCatalogo(VITRINE, deps);

    expect(resultado).toMatchObject({ estado: "destaques", temMais: true });
  });

  it("AniList de pé: página curta é o fim", async function ()
  {
    const deps = fakeDeps();

    const resultado = await buscarNoCatalogo(VITRINE, deps);

    expect(resultado).toMatchObject({ estado: "destaques", temMais: false });
  });

  it("cache local também diz se ainda há mais", async function ()
  {
    const cheia = Array.from({ length: OBRAS_POR_PAGINA }, function (_, indice)
    {
      return { ...OBRA, anilistId: indice + 1 };
    });
    const deps = fakeDeps();
    deps.populares.mockRejectedValue(new Error("anilist fora"));
    deps.noKitsu.mockRejectedValue(new Error("kitsu fora"));
    deps.doCache.mockResolvedValue(cheia);

    const resultado = await buscarNoCatalogo(VITRINE, deps);

    expect(resultado).toMatchObject({ estado: "cache", temMais: true });
  });
});
