import { describe, expect, it, vi } from "vitest";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { interpretarFiltros } from "@/server/domain/catalogo-filtros";
import { lembrarPorTempo } from "@/server/domain/memoria-curta";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import { buscarNoCatalogo, OBRAS_POR_PAGINA } from "@/server/services/catalogo.service";

const OBRA: MediaDoAniList = { anilistId: 30013, kitsuId: 43, type: "MANGA", titleRomaji: "Vinland Saga" };
const OUTRA: MediaDoAniList = { anilistId: 30656, type: "MANGA", titleRomaji: "Vagabond" };

function fakeDeps()
{
  return {
    populares: vi.fn(async () => [OUTRA]),
    filtrado: vi.fn(async () => [OUTRA]),
    limitar: vi.fn(async (): Promise<Veredito> => ({ bloqueado: false })),
    doCache: vi.fn(async (): Promise<MediaDoAniList[]> => []),
    noKitsu: vi.fn(async () => ({ obras: [OBRA], temMais: true })),
  };
}

describe("Kitsu como fonte principal do catálogo", () =>
{
  it.each([{}, { q: "vinland", genero: "Action" }, { tipo: "manhwa" }])(
    "consulta primeiro o Kitsu com todos os filtros: %j", async (params) =>
    {
      const deps = fakeDeps();
      const filtro = interpretarFiltros(params);
      expect(await buscarNoCatalogo(filtro, deps, undefined, 3))
        .toEqual({ estado: "kitsu", termo: filtro.termo, obras: [OBRA], temMais: true });
      expect(deps.noKitsu).toHaveBeenCalledWith(filtro, 3);
      expect(deps.populares).not.toHaveBeenCalled();
      expect(deps.filtrado).not.toHaveBeenCalled();
      expect(deps.doCache).not.toHaveBeenCalled();
    },
  );

  it("busca vazia válida não aciona outra fonte", async () =>
  {
    const deps = fakeDeps();
    deps.noKitsu.mockResolvedValue({ obras: [], temMais: false });
    expect(await buscarNoCatalogo(interpretarFiltros({ q: "zzzzz" }), deps))
      .toEqual({ estado: "vazio", termo: "zzzzz" });
    expect(deps.filtrado).not.toHaveBeenCalled();
    expect(deps.doCache).not.toHaveBeenCalled();
  });

  it("página sem obras aproveitáveis permite continuar quando a fonte tem mais", async () =>
  {
    const deps = fakeDeps();
    deps.noKitsu.mockResolvedValue({ obras: [], temMais: true });
    expect(await buscarNoCatalogo(interpretarFiltros({}), deps))
      .toEqual({ estado: "kitsu", termo: "", obras: [], temMais: true });
    expect(deps.populares).not.toHaveBeenCalled();
  });

  it("respeita o fim informado pelo Kitsu mesmo com obras na página", async () =>
  {
    const deps = fakeDeps();
    deps.noKitsu.mockResolvedValue({ obras: [OBRA], temMais: false });
    expect(await buscarNoCatalogo(interpretarFiltros({}), deps, undefined, 9))
      .toMatchObject({ estado: "kitsu", temMais: false });
    expect(deps.noKitsu).toHaveBeenCalledWith(interpretarFiltros({}), 9);
  });

  it("reutiliza a vitrine durante a janela de cache", async () =>
  {
    let instante = 0;
    const deps = fakeDeps();
    const consultar = deps.noKitsu;
    const comMemoria = { ...deps, noKitsu: lembrarPorTempo(consultar, 30_000, () => instante) };
    await buscarNoCatalogo(interpretarFiltros({}), comMemoria);
    instante = 29_999;
    await buscarNoCatalogo(interpretarFiltros({}), comMemoria);
    expect(consultar).toHaveBeenCalledTimes(1);
    instante = 30_001;
    await buscarNoCatalogo(interpretarFiltros({}), comMemoria);
    expect(consultar).toHaveBeenCalledTimes(2);
  });
});

describe("limite antes de consultar as fontes", () =>
{
  it("bloqueia a busca sem chamar Kitsu, AniList ou cache", async () =>
  {
    const deps = fakeDeps();
    deps.limitar.mockResolvedValue({ bloqueado: true, esperarSegundos: 30 });
    expect(await buscarNoCatalogo(interpretarFiltros({ q: "berserk" }), deps, "1.2.3.4"))
      .toEqual({ estado: "muitos_pedidos", termo: "berserk" });
    expect(deps.noKitsu).not.toHaveBeenCalled();
    expect(deps.filtrado).not.toHaveBeenCalled();
    expect(deps.doCache).not.toHaveBeenCalled();
  });

  it("falha do limitador não permite contornar o limite via fallback", async () =>
  {
    const deps = fakeDeps();
    deps.limitar.mockRejectedValue(new Error("limite fora"));
    expect(await buscarNoCatalogo(interpretarFiltros({ q: "berserk" }), deps, "1.2.3.4"))
      .toEqual({ estado: "indisponivel", termo: "berserk" });
    expect(deps.noKitsu).not.toHaveBeenCalled();
    expect(deps.filtrado).not.toHaveBeenCalled();
  });

  it("vitrine e chamadas sem IP mantêm as regras existentes", async () =>
  {
    const deps = fakeDeps();
    await buscarNoCatalogo(interpretarFiltros({}), deps, "1.2.3.4");
    await buscarNoCatalogo(interpretarFiltros({ q: "berserk" }), deps);
    expect(deps.limitar).not.toHaveBeenCalled();
    expect(deps.noKitsu).toHaveBeenCalledTimes(2);
  });
});

describe("AniList como fallback e cache como último recurso", () =>
{
  function comKitsuFora()
  {
    const deps = fakeDeps();
    deps.noKitsu.mockRejectedValue(new Error("Kitsu fora"));
    return deps;
  }

  it("Kitsu falhando usa os mesmos filtros e página no AniList", async () =>
  {
    const deps = comKitsuFora();
    const filtro = interpretarFiltros({ q: "vagabond", genero: "Action" });
    expect(await buscarNoCatalogo(filtro, deps, undefined, 3))
      .toEqual({ estado: "ok", termo: "vagabond", obras: [OUTRA], temMais: false });
    expect(deps.filtrado).toHaveBeenCalledWith(filtro, 3);
    expect(deps.noKitsu.mock.invocationCallOrder[0]).toBeLessThan(deps.filtrado.mock.invocationCallOrder[0]);
    expect(deps.populares).not.toHaveBeenCalled();
    expect(deps.doCache).not.toHaveBeenCalled();
  });

  it("vitrine usa os populares do AniList no fallback", async () =>
  {
    const deps = comKitsuFora();
    expect(await buscarNoCatalogo(interpretarFiltros({}), deps, undefined, 2))
      .toEqual({ estado: "destaques", termo: "", obras: [OUTRA], temMais: false });
    expect(deps.populares).toHaveBeenCalledWith(2);
  });

  it("resposta vazia do AniList encerra a busca sem consultar o cache", async () =>
  {
    const deps = comKitsuFora();
    deps.filtrado.mockResolvedValue([]);
    expect(await buscarNoCatalogo(interpretarFiltros({ q: "zzz" }), deps))
      .toEqual({ estado: "vazio", termo: "zzz" });
    expect(deps.doCache).not.toHaveBeenCalled();
  });

  it("página cheia do AniList permite continuar", async () =>
  {
    const deps = comKitsuFora();
    deps.populares.mockResolvedValue(Array.from({ length: OBRAS_POR_PAGINA }, (_, i) => ({ ...OUTRA, anilistId: i + 1 })));
    expect(await buscarNoCatalogo(interpretarFiltros({}), deps)).toMatchObject({ temMais: true });
  });

  it.each([{}, { q: "vinland" }])("ambas as fontes falhando consultam o cache: %j", async (params) =>
  {
    const deps = comKitsuFora();
    deps.populares.mockRejectedValue(new Error("AniList fora"));
    deps.filtrado.mockRejectedValue(new Error("AniList fora"));
    deps.doCache.mockResolvedValue([OBRA]);
    const filtro = interpretarFiltros(params);
    expect(await buscarNoCatalogo(filtro, deps, undefined, 2))
      .toEqual({ estado: "cache", termo: filtro.termo, obras: [OBRA], temMais: false });
    expect(deps.doCache).toHaveBeenCalledWith(filtro.termo, 2);
  });

  it.each([false, true])("sem fontes e sem cache utilizável: indisponível (banco fora: %s)", async (bancoFora) =>
  {
    const deps = comKitsuFora();
    deps.populares.mockRejectedValue(new Error("AniList fora"));
    if (bancoFora) deps.doCache.mockRejectedValue(new Error("banco fora"));
    expect(await buscarNoCatalogo(interpretarFiltros({}), deps)).toEqual({ estado: "indisponivel", termo: "" });
  });
});
