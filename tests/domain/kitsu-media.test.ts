import { describe, expect, it } from "vitest";
import { traduzirDoKitsu } from "@/server/domain/kitsu-media";

// #219: o Kitsu tapa o buraco enquanto o AniList esta fora. A traducao e' pura,
// e a regra que nao pode quebrar e' a identidade: obra sem `anilistId` no
// mapeamento NAO entra, senao vira linha orfa que o espelho do AniList (#215)
// nunca vai reconhecer.

function obra(atributos: Record<string, unknown> = {}, anilistId: string | null = "30656")
{
  return {
    dados: {
      id: "1482",
      attributes: {
        canonicalTitle: "Vagabond",
        titles: { en_jp: "Vagabond", ja_jp: "バガボンド", en: "Vagabond" },
        subtype: "manga",
        chapterCount: 327,
        startDate: "1998-09-03",
        averageRating: "84.22",
        synopsis: "Miyamoto Musashi",
        posterImage: { original: "https://exemplo/capa.jpg" },
      },
      ...atributos,
    },
    anilistId,
  };
}

describe("traduzirDoKitsu", function ()
{
  it("traduz o essencial, com o anilistId do mapeamento", function ()
  {
    const media = traduzirDoKitsu(obra());

    expect(media).toMatchObject({
      anilistId: 30656,
      type: "MANGA",
      titleRomaji: "Vagabond",
      chapters: 327,
      startYear: 1998,
    });
  });

  it("sem anilistId, NAO vira obra", function ()
  {
    expect(traduzirDoKitsu(obra({}, null))).toBeNull();
    expect(traduzirDoKitsu(obra({}, "nao-e-numero"))).toBeNull();
  });

  it("manhwa e manhua viram pais de origem; manga NAO assume Japao", function ()
  {
    expect(traduzirDoKitsu(obra({ attributes: { canonicalTitle: "Solo Leveling", subtype: "manhwa" } }))?.countryOfOrigin)
      .toBe("KR");
    expect(traduzirDoKitsu(obra({ attributes: { canonicalTitle: "19 Days", subtype: "manhua" } }))?.countryOfOrigin)
      .toBe("CN");
    // O Kitsu nao informa o pais de obra japonesa. Assumir seria inventar dado.
    expect(traduzirDoKitsu(obra())?.countryOfOrigin).toBeUndefined();
  });

  it("novel vira NOVEL; formato que nao cabe no nosso enum e' descartado", function ()
  {
    expect(traduzirDoKitsu(obra({ attributes: { canonicalTitle: "x", subtype: "novel" } }))?.type).toBe("NOVEL");
    // oneshot, doujin e oel nao existem no nosso modelo — a obra nao entra.
    expect(traduzirDoKitsu(obra({ attributes: { canonicalTitle: "x", subtype: "oneshot" } }))).toBeNull();
    expect(traduzirDoKitsu(obra({ attributes: { canonicalTitle: "x", subtype: "doujin" } }))).toBeNull();
  });

  it("campo ausente fica ausente, nunca chutado", function ()
  {
    const media = traduzirDoKitsu(obra({
      attributes: { canonicalTitle: "Tower of God", subtype: "manhwa" },
    }));

    expect(media?.chapters).toBeUndefined();
    expect(media?.startYear).toBeUndefined();
    expect(media?.coverImageUrl).toBeUndefined();
    expect(media?.averageScore).toBeUndefined();
  });

  it("a nota do Kitsu vem em texto e vira numero inteiro", function ()
  {
    expect(traduzirDoKitsu(obra())?.averageScore).toBe(84);
  });

  it("sem titulo nao vira obra", function ()
  {
    expect(traduzirDoKitsu(obra({ attributes: { subtype: "manga" } }))).toBeNull();
  });
});
