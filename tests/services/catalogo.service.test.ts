import { describe, expect, it, vi } from "vitest";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { interpretarFiltros } from "@/server/domain/catalogo-filtros";
import { lembrarPorTempo } from "@/server/domain/memoria-curta";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import { buscarNoCatalogo } from "@/server/services/catalogo.service";

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
  };
}

describe("buscarNoCatalogo com termo ou filtro", function ()
{
  it("busca filtrada com o filtro inteiro e devolve ok", async function ()
  {
    const deps = fakeDeps();
    const filtro = interpretarFiltros({ q: "vinland", genero: "Action" });

    const resultado = await buscarNoCatalogo(filtro, deps);

    expect(deps.filtrado).toHaveBeenCalledWith(filtro);
    expect(resultado).toEqual({ estado: "ok", termo: "vinland", obras: [OBRA] });
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

    expect(resultado).toEqual({ estado: "destaques", termo: "", obras: [OBRA] });
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
