import { describe, expect, it, vi } from "vitest";
import type { MediaCompleta } from "@/server/repositories/media.repository";
import { obraParaPagina } from "@/server/services/obra.service";

// As regras da issue #35: cache fresco não gasta cota; velho rebusca e
// regrava; AniList fora serve o cache que houver (página é leitura) e só é
// indisponível sem cache nenhum. Similares falhando somem sem derrubar a
// página. O recorte do usuário só existe com sessão.

const AGORA = new Date("2026-09-01T12:00:00Z");
const FRESCO = new Date(AGORA.getTime() - 60 * 60 * 1000);
const VELHO = new Date(AGORA.getTime() - 25 * 60 * 60 * 1000);

const NO_CACHE: MediaCompleta = {
  id: "m1",
  anilistId: 30656,
  type: "MANGA",
  countryOfOrigin: "JP",
  titleRomaji: "Vagabond",
  titleEnglish: "Vagabond",
  titleNative: null,
  coverImageUrl: "https://capa",
  bannerImageUrl: "https://banner",
  description: "Musashi.",
  chapters: 327,
  startYear: 1998,
  genres: ["Action", "Drama"],
  averageScore: 92,
  autores: [{ anilistStaffId: 96879, nome: "Takehiko Inoue", papel: "Story & Art" }],
  syncedAt: FRESCO,
};

const DO_ANILIST = {
  anilistId: 30656,
  type: "MANGA" as const,
  titleRomaji: "Vagabond",
  chapters: 327,
};

function fakeDeps(cenario: {
  noCache?: MediaCompleta | null;
  noAniList?: typeof DO_ANILIST | null;
  anilistFora?: boolean;
  similaresFora?: boolean;
})
{
  const buscarCompleta = vi.fn(async function ()
  {
    return cenario.noCache ?? null;
  });
  const buscarNoAniList = vi.fn(async function ()
  {
    if (cenario.anilistFora)
    {
      throw new Error("fora");
    }
    return cenario.noAniList === undefined ? DO_ANILIST : cenario.noAniList;
  });
  const salvarMedia = vi.fn(async function ()
  {
    return { id: "m1", syncedAt: AGORA };
  });
  const buscarSimilares = vi.fn(async function ()
  {
    if (cenario.similaresFora)
    {
      throw new Error("fora");
    }
    return [DO_ANILIST];
  });
  const buscarEntrada = vi.fn(async function (): Promise<{
    entradaId: string;
    status: "READING";
    progressChapter: string | null;
  } | null>
  {
    return { entradaId: "e1", status: "READING", progressChapter: "57.5" };
  });
  const buscarFonte = vi.fn(async function ()
  {
    return { id: "f1", sourceHost: "mangafire.to", urlTemplate: "/title/4mx-vagabondd" };
  });
  const buscarAvaliacao = vi.fn(async function ()
  {
    return { mediaId: "m1", rating: "4.5", review: null, containsSpoilers: false };
  });

  return {
    deps: {
      buscarCompleta,
      buscarNoAniList,
      salvarMedia,
      buscarSimilares,
      buscarEntrada,
      buscarFonte,
      buscarAvaliacao,
      relogio: function () { return AGORA; },
    },
    buscarNoAniList,
    salvarMedia,
    buscarEntrada,
  };
}

describe("obraParaPagina", function ()
{
  it("cache fresco não gasta cota do AniList", async function ()
  {
    const { deps, buscarNoAniList } = fakeDeps({ noCache: NO_CACHE });

    const resultado = await obraParaPagina(30656, null, deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(buscarNoAniList).not.toHaveBeenCalled();
    expect(resultado.obra.titleRomaji).toBe("Vagabond");
    expect(resultado.obra.autores[0].nome).toBe("Takehiko Inoue");
    expect(resultado.minha).toBeNull();
  });

  it("cache velho rebusca e regrava", async function ()
  {
    const { deps, buscarNoAniList, salvarMedia } = fakeDeps({
      noCache: { ...NO_CACHE, syncedAt: VELHO },
    });

    const resultado = await obraParaPagina(30656, null, deps);

    expect(resultado.estado).toBe("ok");
    expect(buscarNoAniList).toHaveBeenCalledWith(30656);
    expect(salvarMedia).toHaveBeenCalled();
  });

  it("obra que o AniList não tem é nao_encontrada", async function ()
  {
    const { deps } = fakeDeps({ noCache: null, noAniList: null });

    await expect(obraParaPagina(1, null, deps)).resolves.toEqual({
      estado: "nao_encontrada",
    });
  });

  it("AniList fora serve o cache mesmo velho — página é leitura", async function ()
  {
    const { deps } = fakeDeps({
      noCache: { ...NO_CACHE, syncedAt: VELHO },
      anilistFora: true,
    });

    const resultado = await obraParaPagina(30656, null, deps);

    expect(resultado.estado).toBe("ok");
  });

  it("AniList fora sem cache é indisponivel", async function ()
  {
    const { deps } = fakeDeps({ noCache: null, anilistFora: true });

    await expect(obraParaPagina(30656, null, deps)).resolves.toEqual({
      estado: "indisponivel",
    });
  });

  it("similares falhando somem sem derrubar a página", async function ()
  {
    const { deps } = fakeDeps({ noCache: NO_CACHE, similaresFora: true });

    const resultado = await obraParaPagina(30656, null, deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(resultado.similares).toEqual([]);
  });

  it("com sessão, compõe o recorte do usuário com fonte e avaliação", async function ()
  {
    const { deps, buscarEntrada } = fakeDeps({ noCache: NO_CACHE });

    const resultado = await obraParaPagina(30656, "u1", deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(buscarEntrada).toHaveBeenCalledWith("u1", "m1");
    expect(resultado.minha).toEqual({
      entradaId: "e1",
      status: "READING",
      progressChapter: "57.5",
      proximoCapitulo: 58,
      fonte: {
        sourceHost: "mangafire.to",
        tipo: "pagina",
        urlDaObra: "https://mangafire.to/title/4mx-vagabondd",
      },
      avaliacao: { rating: "4.5", review: null, containsSpoilers: false },
    });
  });

  it("sem entrada na estante, minha traz só o anilistId para o botão de adicionar", async function ()
  {
    const { deps } = fakeDeps({ noCache: NO_CACHE });
    deps.buscarEntrada = vi.fn(async function () { return null; });

    const resultado = await obraParaPagina(30656, "u1", deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(resultado.minha).toBeNull();
  });
});
