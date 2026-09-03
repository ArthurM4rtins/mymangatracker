import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { interpretarFiltros } from "@/server/domain/catalogo-filtros";
import { buscarNoCatalogo } from "@/server/services/catalogo.service";
import { buscarFiltrado, buscarPopulares } from "@/server/infra/anilist";

// Issue #17: campo vazio é a vitrine de populares. Issue #37: com termo OU
// filtro ativo, a busca filtrada assume. AniList fora nunca vira 500.

vi.mock("@/server/infra/anilist", function ()
{
  return {
    buscarFiltrado: vi.fn(),
    buscarPopulares: vi.fn(),
  };
});

const OBRA: MediaDoAniList = {
  anilistId: 30013,
  type: "MANGA",
  titleRomaji: "Vinland Saga",
  countryOfOrigin: "JP",
  chapters: 224,
};

beforeEach(function ()
{
  vi.mocked(buscarFiltrado).mockReset();
  vi.mocked(buscarPopulares).mockReset();
});

describe("buscarNoCatalogo com termo ou filtro", function ()
{
  it("busca filtrada com o filtro inteiro e devolve ok", async function ()
  {
    vi.mocked(buscarFiltrado).mockResolvedValue([OBRA]);
    const filtro = interpretarFiltros({ q: "vinland", genero: "Action" });

    const resultado = await buscarNoCatalogo(filtro);

    expect(buscarFiltrado).toHaveBeenCalledWith(filtro);
    expect(resultado).toEqual({ estado: "ok", termo: "vinland", obras: [OBRA] });
    expect(buscarPopulares).not.toHaveBeenCalled();
  });

  it("filtro sem termo também é busca, não vitrine", async function ()
  {
    vi.mocked(buscarFiltrado).mockResolvedValue([OBRA]);

    const resultado = await buscarNoCatalogo(interpretarFiltros({ tipo: "manhwa" }));

    expect(resultado.estado).toBe("ok");
    expect(buscarPopulares).not.toHaveBeenCalled();
  });

  it("devolve vazio quando a busca não encontra nada", async function ()
  {
    vi.mocked(buscarFiltrado).mockResolvedValue([]);

    const resultado = await buscarNoCatalogo(interpretarFiltros({ q: "zzzzz" }));

    expect(resultado).toEqual({ estado: "vazio", termo: "zzzzz" });
  });

  it("devolve indisponivel quando o AniList falha", async function ()
  {
    vi.mocked(buscarFiltrado).mockRejectedValue(new Error("fora"));

    const resultado = await buscarNoCatalogo(interpretarFiltros({ q: "vinland" }));

    expect(resultado).toEqual({ estado: "indisponivel", termo: "vinland" });
  });
});

describe("buscarNoCatalogo sem termo nem filtro", function ()
{
  it("devolve os populares como destaques", async function ()
  {
    vi.mocked(buscarPopulares).mockResolvedValue([OBRA]);

    const resultado = await buscarNoCatalogo(interpretarFiltros({}));

    expect(resultado).toEqual({ estado: "destaques", termo: "", obras: [OBRA] });
    expect(buscarFiltrado).not.toHaveBeenCalled();
  });

  it("devolve vazio quando os populares vêm vazios", async function ()
  {
    vi.mocked(buscarPopulares).mockResolvedValue([]);

    const resultado = await buscarNoCatalogo(interpretarFiltros({ q: "   " }));

    expect(resultado).toEqual({ estado: "vazio", termo: "" });
  });

  it("devolve indisponivel quando o AniList falha", async function ()
  {
    vi.mocked(buscarPopulares).mockRejectedValue(new Error("fora"));

    const resultado = await buscarNoCatalogo(interpretarFiltros({}));

    expect(resultado).toEqual({ estado: "indisponivel", termo: "" });
  });
});
