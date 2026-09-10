import { describe, expect, it, vi } from "vitest";

import { buscarObraNaFonte } from "@/server/services/obra-externa.service";
import type { MediaDoAniList } from "@/server/domain/anilist-media";

/**
 * A escada de buscar a obra na fonte (#254). Estava escrita três vezes; aqui
 * ela é uma só, e passa a ter dois caminhos, porque a obra pode nascer no Kitsu.
 */
const DO_ANILIST: MediaDoAniList = { anilistId: 30002, type: "MANGA", titleRomaji: "Berserk" };
const DO_KITSU: MediaDoAniList = { kitsuId: 54598, type: "MANGA", titleRomaji: "TBATE" };

function deps(cenario: {
  anilist?: MediaDoAniList | null | Error;
  kitsuPorAnilist?: MediaDoAniList | null | Error;
  kitsuPorId?: MediaDoAniList | null | Error;
} = {})
{
  const responder = function (valor: MediaDoAniList | null | Error | undefined)
  {
    return vi.fn(async function (): Promise<MediaDoAniList | null>
    {
      if (valor instanceof Error) throw valor;
      return valor ?? null;
    });
  };

  return {
    noAniList: responder(cenario.anilist),
    noKitsuPorAniList: responder(cenario.kitsuPorAnilist),
    noKitsuPorId: responder(cenario.kitsuPorId),
  };
}

describe("buscarObraNaFonte", function ()
{
  it("referencia do AniList vai ao AniList, e nem toca no Kitsu", async function ()
  {
    const fontes = deps({ anilist: DO_ANILIST });

    await expect(buscarObraNaFonte({ fonte: "anilist", id: 30002 }, fontes))
      .resolves.toEqual({ estado: "ok", obra: DO_ANILIST, respondeu: "anilist" });
    expect(fontes.noKitsuPorAniList).not.toHaveBeenCalled();
    expect(fontes.noKitsuPorId).not.toHaveBeenCalled();
  });

  it("AniList fora desce para o Kitsu pelo mapeamento", async function ()
  {
    const fontes = deps({ anilist: new Error("fora"), kitsuPorAnilist: DO_ANILIST });

    await expect(buscarObraNaFonte({ fonte: "anilist", id: 30002 }, fontes))
      .resolves.toEqual({ estado: "ok", obra: DO_ANILIST, respondeu: "kitsu" });
    expect(fontes.noKitsuPorAniList).toHaveBeenCalledWith(30002);
  });

  it("os dois fora: indisponivel, que nao e 'nao existe'", async function ()
  {
    const fontes = deps({ anilist: new Error("fora"), kitsuPorAnilist: new Error("fora") });

    await expect(buscarObraNaFonte({ fonte: "anilist", id: 30002 }, fontes))
      .resolves.toEqual({ estado: "indisponivel" });
  });

  it("fonte respondeu e a obra nao existe: ok com nulo, nao indisponivel", async function ()
  {
    const fontes = deps({ anilist: null });

    await expect(buscarObraNaFonte({ fonte: "anilist", id: 1 }, fontes))
      .resolves.toEqual({ estado: "ok", obra: null, respondeu: "anilist" });
  });

  // #254: quem respondeu importa. AniList fora e Kitsu sem conhecer a obra nao
  // prova que ela sumiu — o Kitsu tem bem menos obras. Quem chama precisa
  // dessa diferenca para nao trocar cache velho por 404.
  it("AniList fora e Kitsu sem a obra: ok com nulo, mas quem respondeu foi o Kitsu", async function ()
  {
    const fontes = deps({ anilist: new Error("fora"), kitsuPorAnilist: null });

    await expect(buscarObraNaFonte({ fonte: "anilist", id: 30002 }, fontes))
      .resolves.toEqual({ estado: "ok", obra: null, respondeu: "kitsu" });
  });

  // Obra do Kitsu nao tem degrau de baixo: o AniList nao a conhece, e e por
  // isso que ela e chamada pelo Kitsu.
  it("referencia do Kitsu vai direto ao Kitsu, sem passar pelo AniList", async function ()
  {
    const fontes = deps({ kitsuPorId: DO_KITSU });

    await expect(buscarObraNaFonte({ fonte: "kitsu", id: 54598 }, fontes))
      .resolves.toEqual({ estado: "ok", obra: DO_KITSU, respondeu: "kitsu" });
    expect(fontes.noAniList).not.toHaveBeenCalled();
    expect(fontes.noKitsuPorId).toHaveBeenCalledWith(54598);
  });

  it("Kitsu fora numa obra so-Kitsu: indisponivel", async function ()
  {
    const fontes = deps({ kitsuPorId: new Error("fora") });

    await expect(buscarObraNaFonte({ fonte: "kitsu", id: 54598 }, fontes))
      .resolves.toEqual({ estado: "indisponivel" });
  });
});
