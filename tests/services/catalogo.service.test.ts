import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { buscarNoCatalogo } from "@/server/services/catalogo.service";
import { buscarMedia, buscarPopulares } from "@/server/infra/anilist";

// Issue #17: campo vazio deixa de ser tela vazia — vira a vitrine de populares.
// Termo preenchido continua sendo busca. AniList fora nunca vira 500.

vi.mock("@/server/infra/anilist", function ()
{
  return {
    buscarMedia: vi.fn(),
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
  vi.mocked(buscarMedia).mockReset();
  vi.mocked(buscarPopulares).mockReset();
});

describe("buscarNoCatalogo com termo", function ()
{
  it("busca pelo termo e devolve ok com as obras", async function ()
  {
    vi.mocked(buscarMedia).mockResolvedValue([OBRA]);

    const resultado = await buscarNoCatalogo("vinland");

    expect(resultado).toEqual({ estado: "ok", termo: "vinland", obras: [OBRA] });
    expect(buscarPopulares).not.toHaveBeenCalled();
  });

  it("devolve vazio quando a busca não encontra nada", async function ()
  {
    vi.mocked(buscarMedia).mockResolvedValue([]);

    const resultado = await buscarNoCatalogo("zzzzz");

    expect(resultado).toEqual({ estado: "vazio", termo: "zzzzz" });
  });

  it("devolve indisponivel quando o AniList falha", async function ()
  {
    vi.mocked(buscarMedia).mockRejectedValue(new Error("fora"));

    const resultado = await buscarNoCatalogo("vinland");

    expect(resultado).toEqual({ estado: "indisponivel", termo: "vinland" });
  });
});

describe("buscarNoCatalogo sem termo", function ()
{
  it("devolve os populares como destaques", async function ()
  {
    vi.mocked(buscarPopulares).mockResolvedValue([OBRA]);

    const resultado = await buscarNoCatalogo("");

    expect(resultado).toEqual({ estado: "destaques", termo: "", obras: [OBRA] });
    expect(buscarMedia).not.toHaveBeenCalled();
  });

  it("trata só espaços como termo vazio", async function ()
  {
    vi.mocked(buscarPopulares).mockResolvedValue([OBRA]);

    const resultado = await buscarNoCatalogo("   ");

    expect(resultado.estado).toBe("destaques");
  });

  it("devolve vazio quando os populares vêm vazios", async function ()
  {
    vi.mocked(buscarPopulares).mockResolvedValue([]);

    const resultado = await buscarNoCatalogo("");

    expect(resultado).toEqual({ estado: "vazio", termo: "" });
  });

  it("devolve indisponivel quando o AniList falha", async function ()
  {
    vi.mocked(buscarPopulares).mockRejectedValue(new Error("fora"));

    const resultado = await buscarNoCatalogo("");

    expect(resultado).toEqual({ estado: "indisponivel", termo: "" });
  });
});
