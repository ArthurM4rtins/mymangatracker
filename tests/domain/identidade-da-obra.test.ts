import { describe, expect, it } from "vitest";

import { referenciaDaObra, semRepetidas } from "@/server/domain/anilist-media";
import type { MediaDoAniList } from "@/server/domain/anilist-media";

/**
 * Fase 2 de #254: a obra carrega os DOIS nomes possíveis, e a referência sai
 * deles. O tipo garante o que o `CHECK` do banco garante — pelo menos um.
 */
const BERSERK: MediaDoAniList = {
  anilistId: 30002,
  kitsuId: 8,
  type: "MANGA",
  titleRomaji: "Berserk",
};

const TBATE: MediaDoAniList = {
  kitsuId: 54598,
  type: "MANGA",
  titleRomaji: "The Beginning After the End",
};

describe("referenciaDaObra", function ()
{
  it("com os dois nomes, o AniList manda", function ()
  {
    expect(referenciaDaObra(BERSERK)).toEqual({ fonte: "anilist", id: 30002 });
  });

  it("obra que so o Kitsu conhece e chamada pelo Kitsu", function ()
  {
    expect(referenciaDaObra(TBATE)).toEqual({ fonte: "kitsu", id: 54598 });
  });

  it("obra so do AniList segue chamada por ele", function ()
  {
    expect(referenciaDaObra({ anilistId: 30013 }))
      .toEqual({ fonte: "anilist", id: 30013 });
  });
});

// A regra de nao repetir obra na mesma resposta (#240) passa a valer pela
// REFERENCIA, e nao pelo anilistId -- senao duas obras so-Kitsu, ambas sem
// AniList, seriam lidas como a mesma coisa e uma sumiria.
describe("semRepetidas com obra sem AniList", function ()
{
  it("duas obras so-Kitsu diferentes nao se cancelam", function ()
  {
    const outra: MediaDoAniList = { kitsuId: 54597, type: "MANGA", titleRomaji: "TBATE (comic)" };

    expect(semRepetidas([TBATE, outra])).toHaveLength(2);
  });

  it("a mesma obra so-Kitsu duas vezes vira uma", function ()
  {
    expect(semRepetidas([TBATE, { ...TBATE, titleRomaji: "outro titulo" }])).toHaveLength(1);
  });

  it("obra do AniList e obra do Kitsu nao se confundem por id igual", function ()
  {
    // anilistId 8 e kitsuId 8 sao obras diferentes; a fonte e parte da chave.
    const doAniList: MediaDoAniList = { anilistId: 8, type: "MANGA", titleRomaji: "A" };
    const doKitsu: MediaDoAniList = { kitsuId: 8, type: "MANGA", titleRomaji: "B" };

    expect(semRepetidas([doAniList, doKitsu])).toHaveLength(2);
  });

  it("continua valendo a primeira aparicao", function ()
  {
    const resultado = semRepetidas([BERSERK, { ...BERSERK, titleRomaji: "repetida" }]);

    expect(resultado[0].titleRomaji).toBe("Berserk");
  });
});
