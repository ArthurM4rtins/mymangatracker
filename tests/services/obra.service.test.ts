import { describe, expect, it, vi } from "vitest";
import type { MediaCompleta } from "@/server/repositories/media.repository";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { obraParaPagina } from "@/server/services/obra.service";
import type { ResultadoDaFonte } from "@/server/services/obra-externa.service";
import type { ReferenciaDaObra } from "@/server/domain/referencia-da-obra";

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
  kitsuId: null,
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

const DO_ANILIST: MediaDoAniList = {
  anilistId: 30656,
  type: "MANGA" as const,
  titleRomaji: "Vagabond",
  chapters: 327,
};

// A obra que so existe no Kitsu (#254): sem anilistId nenhum.
const DO_KITSU: MediaDoAniList = {
  kitsuId: 54598,
  type: "NOVEL" as const,
  titleRomaji: "The Beginning After the End",
};

function fakeDeps(cenario: {
  noCache?: MediaCompleta | null;
  noAniList?: MediaDoAniList | null;
  anilistFora?: boolean;
  noKitsu?: MediaDoAniList | null;
  kitsuFora?: boolean;
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
  const buscarNoKitsu = vi.fn(async function ()
  {
    if (cenario.kitsuFora)
    {
      throw new Error("fora");
    }
    return cenario.noKitsu === undefined ? null : cenario.noKitsu;
  });
  // A escada de fontes virou um servico so (#254). Aqui ela e reproduzida
  // chamando as mesmas duas pontas, para as asercoes continuarem falando de
  // quem foi consultado; a escada de verdade tem os testes dela.
  const buscarNaFonte = vi.fn(async function (
    referencia: ReferenciaDaObra,
  ): Promise<ResultadoDaFonte>
  {
    if (referencia.fonte === "kitsu")
    {
      try
      {
        return { estado: "ok", obra: await buscarNoKitsu(), respondeu: "kitsu" };
      }
      catch
      {
        return { estado: "indisponivel" };
      }
    }

    try
    {
      return { estado: "ok", obra: await buscarNoAniList(), respondeu: "anilist" };
    }
    catch
    {
      try
      {
        return { estado: "ok", obra: await buscarNoKitsu(), respondeu: "kitsu" };
      }
      catch
      {
        return { estado: "indisponivel" };
      }
    }
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
  // O destino do "Continuar leitura" e a ultima abertura da extensao (#170).
  const buscarLeituraMaisAvancada = vi.fn(async function ()
  {
    return {
      resolvedUrl: "https://mangafire.to/title/qnlvj-vagabond22/chapter/7180252",
      chapter: "70",
    };
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
        totalDeComentarios: 0,
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
      buscarNaFonte,
      salvarMedia,
      buscarSimilares,
      buscarEntrada,
      buscarLeituraMaisAvancada,
      buscarAvaliacao,
      listarReviews,
      contarNotas,
      listarAberturas,
      relogio: function () { return AGORA; },
    },
    buscarNoAniList,
    buscarNoKitsu,
    buscarNaFonte,
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

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30656 }, null, deps);

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

  it("a nota do Folunio vem resumida das contagens por valor (issue #48)", async function ()
  {
    const { deps, contarNotas } = fakeDeps({ noCache: NO_CACHE });

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30656 }, null, deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(contarNotas).toHaveBeenCalledWith("m1");
    // (5 + 5 + 4) / 3 = 4.666… → 4.7
    expect(resultado.notaDoFolunio).toMatchObject({ media: 4.7, total: 3 });
    expect(resultado.notaDoFolunio?.histograma).toHaveLength(10);
  });

  it("contagem de notas falhando some sem derrubar a página", async function ()
  {
    const { deps } = fakeDeps({ noCache: NO_CACHE, notasFora: true });

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30656 }, null, deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(resultado.notaDoFolunio).toBeNull();
    expect(resultado.obra.titleRomaji).toBe("Vagabond");
  });

  it("reviews falhando somem sem derrubar a página", async function ()
  {
    const { deps, listarReviews } = fakeDeps({ noCache: NO_CACHE });
    listarReviews.mockRejectedValue(new Error("fora"));

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30656 }, null, deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(resultado.reviews).toEqual([]);
  });

  it("cache velho rebusca e regrava", async function ()
  {
    const { deps, buscarNaFonte, salvarMedia } = fakeDeps({
      noCache: { ...NO_CACHE, syncedAt: VELHO },
    });

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30656 }, null, deps);

    expect(resultado.estado).toBe("ok");
    expect(buscarNaFonte).toHaveBeenCalledWith({ fonte: "anilist", id: 30656 });
    expect(salvarMedia).toHaveBeenCalled();
  });

  it("obra que o AniList não tem é nao_encontrada", async function ()
  {
    const { deps } = fakeDeps({ noCache: null, noAniList: null });

    await expect(obraParaPagina({ fonte: "anilist", id: 1 }, null, deps)).resolves.toEqual({
      estado: "nao_encontrada",
    });
  });

  it("AniList fora serve o cache mesmo velho — página é leitura", async function ()
  {
    const { deps } = fakeDeps({
      noCache: { ...NO_CACHE, syncedAt: VELHO },
      anilistFora: true,
    });

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30656 }, null, deps);

    expect(resultado.estado).toBe("ok");
  });

  // #65, item 3: se o AniList já falhou neste request, não pagar um segundo
  // timeout em série pedindo similares ao mesmo AniList.
  it("AniList fora com cache velho não vai buscar similares", async function ()
  {
    const { deps } = fakeDeps({
      noCache: { ...NO_CACHE, syncedAt: VELHO },
      anilistFora: true,
    });

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30656 }, null, deps);

    expect(resultado.estado).toBe("ok");
    expect(deps.buscarSimilares).not.toHaveBeenCalled();
  });

  // O degrau do #219 na página da obra (#227): sem ele, obra que a vitrine do
  // Kitsu acabou de mostrar não abria enquanto o AniList estivesse fora.
  it("AniList fora sem cache: o Kitsu segura a página", async function ()
  {
    const { deps, buscarNoKitsu, salvarMedia } = fakeDeps({
      noCache: null,
      anilistFora: true,
      noKitsu: DO_ANILIST,
    });

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30013 }, null, deps);

    expect(resultado.estado).toBe("ok");
    expect(buscarNoKitsu).toHaveBeenCalled();
    expect(salvarMedia).toHaveBeenCalled();
  });

  it("AniList de pé nunca chama o Kitsu", async function ()
  {
    const { deps, buscarNoKitsu } = fakeDeps({ noCache: null });

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30013 }, null, deps);

    expect(resultado.estado).toBe("ok");
    expect(buscarNoKitsu).not.toHaveBeenCalled();
  });

  it("AniList fora e Kitsu sem a obra: não encontrada", async function ()
  {
    const { deps } = fakeDeps({ noCache: null, anilistFora: true, noKitsu: null });

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30013 }, null, deps);

    expect(resultado.estado).toBe("nao_encontrada");
  });

  // #254: a obra pode nascer NO Kitsu — "The Beginning After the End" e o caso
  // real. A referencia do Kitsu vai direto ao Kitsu; passar o id dele como se
  // fosse do AniList era o que fazia a pagina dizer "o AniList nao respondeu".
  it("referencia do Kitsu abre a página pela fonte dela", async function ()
  {
    const { deps, buscarNoKitsu, buscarNoAniList, salvarMedia } = fakeDeps({
      noCache: null,
      noKitsu: DO_KITSU,
    });

    const resultado = await obraParaPagina({ fonte: "kitsu", id: 54598 }, null, deps);

    expect(resultado.estado).toBe("ok");
    expect(buscarNoKitsu).toHaveBeenCalled();
    expect(buscarNoAniList).not.toHaveBeenCalled();
    expect(salvarMedia).toHaveBeenCalled();
    expect(deps.buscarCompleta).toHaveBeenCalledWith({ fonte: "kitsu", id: 54598 });
  });

  it("obra so-Kitsu que o Kitsu nao tem é nao_encontrada", async function ()
  {
    const { deps } = fakeDeps({ noCache: null, noKitsu: null });

    await expect(obraParaPagina({ fonte: "kitsu", id: 1 }, null, deps)).resolves.toEqual({
      estado: "nao_encontrada",
    });
  });

  it("obra so-Kitsu com o Kitsu fora e sem cache é indisponivel", async function ()
  {
    const { deps } = fakeDeps({ noCache: null, kitsuFora: true });

    await expect(obraParaPagina({ fonte: "kitsu", id: 54598 }, null, deps)).resolves.toEqual({
      estado: "indisponivel",
    });
  });

  // O Kitsu nao conhecer uma obra DO ANILIST nao prova que ela sumiu: ele tem
  // bem menos obras. Com cache na mao, a pagina serve o cache velho em vez de
  // trocar uma pagina que funcionava por um 404.
  it("AniList fora e Kitsu sem a obra, mas com cache: serve o cache, não é 404", async function ()
  {
    const { deps } = fakeDeps({
      noCache: { ...NO_CACHE, syncedAt: VELHO },
      anilistFora: true,
      noKitsu: null,
    });

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30656 }, null, deps);

    expect(resultado.estado).toBe("ok");
    expect(deps.salvarMedia).not.toHaveBeenCalled();
  });

  it("as duas fontes fora sem cache é indisponivel", async function ()
  {
    const { deps } = fakeDeps({ noCache: null, anilistFora: true, kitsuFora: true });

    await expect(obraParaPagina({ fonte: "anilist", id: 30656 }, null, deps)).resolves.toEqual({
      estado: "indisponivel",
    });
  });

  // Issue #63: banco fora (primeiro deploy sem Neon, ou Neon caído) tem que
  // degradar como as outras páginas, não estourar 500.
  it("banco fora é indisponivel, sem nem ir ao AniList", async function ()
  {
    const { deps, buscarNoAniList } = fakeDeps({ bancoFora: true });

    await expect(obraParaPagina({ fonte: "anilist", id: 30656 }, null, deps)).resolves.toEqual({
      estado: "indisponivel",
    });
    expect(buscarNoAniList).not.toHaveBeenCalled();
  });

  it("similares falhando somem sem derrubar a página", async function ()
  {
    const { deps } = fakeDeps({ noCache: NO_CACHE, similaresFora: true });

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30656 }, null, deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(resultado.similares).toEqual([]);
  });

  it("histórico falhando some sem derrubar o recorte do usuário", async function ()
  {
    const { deps } = fakeDeps({ noCache: NO_CACHE, historicoFora: true });

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30656 }, "u1", deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(resultado.minha?.entradaId).toBe("e1");
    expect(resultado.minha?.historico).toEqual([]);
  });

  it("com sessão, compõe o recorte do usuário com a ultima leitura e a avaliação", async function ()
  {
    const { deps, buscarEntrada, listarAberturas, listarReviews } = fakeDeps({ noCache: NO_CACHE });

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30656 }, "u1", deps);

    if (resultado.estado !== "ok")
    {
      throw new Error("esperava ok");
    }

    expect(buscarEntrada).toHaveBeenCalledWith("u1", "m1");
    expect(listarAberturas).toHaveBeenCalledWith("u1", "m1", 20);
    // Resenhas da obra com teto (#135): a primeira pagina, nao todas.
    expect(listarReviews).toHaveBeenCalledWith("m1", "u1", 20);
    expect(resultado.minha).toEqual({
      entradaId: "e1",
      status: "READING",
      progressChapter: "57.5",
      continuarEm: {
        url: "https://mangafire.to/title/qnlvj-vagabond22/chapter/7180252",
        host: "mangafire.to",
        capitulo: "70",
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

    const resultado = await obraParaPagina({ fonte: "anilist", id: 30656 }, "u1", deps);

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
