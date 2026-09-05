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
  notasFora?: boolean;
  historicoFora?: boolean;
  bancoFora?: boolean;
})
{
  const buscarCompleta = vi.fn(async function ()
  {
    if (cenario.bancoFora)
    {
      throw new Error("DATABASE_URL ausente");
    }
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
  const listarReviews = vi.fn(async function ()
  {
    return [
      {
        entryId: "r1",
        username: "leitor",
        avatarVersao: null,
        minha: false,
        rating: "5",
        review: "obra-prima",
        containsSpoilers: false,
        publicadaEm: AGORA,
        curtidas: 2,
        curtiPorMim: false,
        comentarios: [],
      },
    ];
  });

  const contarNotas = vi.fn(async function ()
  {
    if (cenario.notasFora)
    {
      throw new Error("fora");
    }
    return [
      { rating: 5, total: 2 },
      { rating: 4, total: 1 },
    ];
  });
  const listarAberturas = vi.fn(async function ()
  {
    if (cenario.historicoFora)
    {
      throw new Error("fora");
    }
    return [
      {
        id: "p2",
        chapter: "57.5",
        abertaEm: AGORA,
        sourceHost: "mangafire.to",
        url: "https://mangafire.to/read/4mx-vagabondd/chapter-57.5",
      },
      {
        id: "p1",
        chapter: "57",
        abertaEm: new Date(AGORA.getTime() - 86_400_000),
        sourceHost: null,
        url: "https://outro.site/57",
      },
    ];
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
      listarReviews,
      contarNotas,
      listarAberturas,
      relogio: function () { return AGORA; },
    },
    buscarNoAniList,
    salvarMedia,
    buscarEntrada,
    listarReviews,
    contarNotas,
    listarAberturas,
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
    expect(resultado.reviews).toHaveLength(1);
    expect(resultado.reviews[0].username).toBe("leitor");
  });

  it("a nota do Kidoku vem resumida das contagens por valor (issue #48)", async function ()
  {
    const { deps, contarNotas } = fakeDeps({ noCache: NO_CACHE });

    const resultado = await obraParaPagina(30656, null, deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(contarNotas).toHaveBeenCalledWith("m1");
    // (5 + 5 + 4) / 3 = 4.666… → 4.7
    expect(resultado.notaDoKidoku).toMatchObject({ media: 4.7, total: 3 });
    expect(resultado.notaDoKidoku?.histograma).toHaveLength(10);
  });

  it("contagem de notas falhando some sem derrubar a página", async function ()
  {
    const { deps } = fakeDeps({ noCache: NO_CACHE, notasFora: true });

    const resultado = await obraParaPagina(30656, null, deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(resultado.notaDoKidoku).toBeNull();
    expect(resultado.obra.titleRomaji).toBe("Vagabond");
  });

  it("reviews falhando somem sem derrubar a página", async function ()
  {
    const { deps, listarReviews } = fakeDeps({ noCache: NO_CACHE });
    listarReviews.mockRejectedValue(new Error("fora"));

    const resultado = await obraParaPagina(30656, null, deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(resultado.reviews).toEqual([]);
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

  // Issue #63: banco fora (primeiro deploy sem Neon, ou Neon caído) tem que
  // degradar como as outras páginas, não estourar 500.
  it("banco fora é indisponivel, sem nem ir ao AniList", async function ()
  {
    const { deps, buscarNoAniList } = fakeDeps({ bancoFora: true });

    await expect(obraParaPagina(30656, null, deps)).resolves.toEqual({
      estado: "indisponivel",
    });
    expect(buscarNoAniList).not.toHaveBeenCalled();
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

  it("histórico falhando some sem derrubar o recorte do usuário", async function ()
  {
    const { deps } = fakeDeps({ noCache: NO_CACHE, historicoFora: true });

    const resultado = await obraParaPagina(30656, "u1", deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(resultado.minha?.entradaId).toBe("e1");
    expect(resultado.minha?.historico).toEqual([]);
  });

  it("com sessão, compõe o recorte do usuário com fonte e avaliação", async function ()
  {
    const { deps, buscarEntrada, listarAberturas } = fakeDeps({ noCache: NO_CACHE });

    const resultado = await obraParaPagina(30656, "u1", deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(buscarEntrada).toHaveBeenCalledWith("u1", "m1");
    expect(listarAberturas).toHaveBeenCalledWith("u1", "m1", 20);
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
      // O histórico é do dono (issue #54): capítulo, quando e por qual fonte.
      historico: [
        {
          id: "p2",
          chapter: "57.5",
          abertaEm: AGORA,
          sourceHost: "mangafire.to",
          url: "https://mangafire.to/read/4mx-vagabondd/chapter-57.5",
        },
        {
          id: "p1",
          chapter: "57",
          abertaEm: new Date(AGORA.getTime() - 86_400_000),
          sourceHost: null,
          url: "https://outro.site/57",
        },
      ],
    });
    expect(resultado.minhaAvaliacao).toEqual({
      rating: "4.5",
      review: null,
      containsSpoilers: false,
    });
  });

  it("sem entrada na estante, a avaliação vem mesmo assim — avaliar não exige estante", async function ()
  {
    const { deps } = fakeDeps({ noCache: NO_CACHE });
    deps.buscarEntrada = vi.fn(async function () { return null; });

    const resultado = await obraParaPagina(30656, "u1", deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(resultado.minha).toBeNull();
    expect(resultado.minhaAvaliacao).toEqual({
      rating: "4.5",
      review: null,
      containsSpoilers: false,
    });
  });
});
