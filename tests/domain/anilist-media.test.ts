import { describe, expect, it } from "vitest";
import { mapearBusca, mapearMedia } from "@/server/domain/anilist-media";

// Registro real, capturado de graphql.anilist.co em 27/08/2026.
const LOOKISM = {
  id: 86848,
  title: { romaji: "Oemo Jisangjuui", english: "Lookism", native: "외모지상주의" },
  format: "MANGA",
  countryOfOrigin: "KR",
  chapters: null,
  status: "RELEASING",
  description:
    "Daniel is an unattractive loner who wakes up in a different body.<br><br>(Source: WEBTOON)",
  coverImage: { large: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx86848.jpg" },
};

describe("mapearMedia", () =>
{
  it("mapeia o registro real do AniList", () =>
  {
    expect(mapearMedia(LOOKISM)).toEqual({
      anilistId: 86848,
      type: "MANGA",
      countryOfOrigin: "KR",
      titleRomaji: "Oemo Jisangjuui",
      titleEnglish: "Lookism",
      titleNative: "외모지상주의",
      coverImageUrl:
        "https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx86848.jpg",
      description: "Daniel is an unattractive loner who wakes up in a different body.\n\n(Source: WEBTOON)",
    });
  });

  it("omite chapters quando a obra ainda está em publicação", () =>
  {
    expect(mapearMedia(LOOKISM)).not.toHaveProperty("chapters");
  });

  it("traz chapters quando o total é conhecido", () =>
  {
    expect(mapearMedia({ ...LOOKISM, chapters: 468 })?.chapters).toBe(468);
  });

  it("omite os títulos que o AniList devolve nulos", () =>
  {
    const semTraducao = mapearMedia({
      ...LOOKISM,
      title: { romaji: "Oemo Jisangjuui", english: null, native: null },
    });

    expect(semTraducao?.titleRomaji).toBe("Oemo Jisangjuui");
    expect(semTraducao).not.toHaveProperty("titleEnglish");
    expect(semTraducao).not.toHaveProperty("titleNative");
  });

  it("tira o HTML da descrição — a API devolve tag mesmo com asHtml false", () =>
  {
    const comTags = mapearMedia({
      ...LOOKISM,
      description: "Uma <i>obra</i> boa.<br><br>Segundo parágrafo.<br>Terceira linha.",
    });

    expect(comTags?.description).toBe(
      "Uma obra boa.\n\nSegundo parágrafo.\nTerceira linha.",
    );
  });

  it("trata ONE_SHOT como MANGA", () =>
  {
    expect(mapearMedia({ ...LOOKISM, format: "ONE_SHOT" })?.type).toBe("MANGA");
  });

  it("mapeia NOVEL", () =>
  {
    expect(mapearMedia({ ...LOOKISM, format: "NOVEL" })?.type).toBe("NOVEL");
  });

  it("descarta formato que não cabe no nosso enum em vez de chutar MANGA", () =>
  {
    expect(mapearMedia({ ...LOOKISM, format: "MUSIC" })).toBeNull();
  });

  it("omite país que não é JP, KR ou CN — o AniList devolve US e TW também", () =>
  {
    const americana = mapearMedia({ ...LOOKISM, countryOfOrigin: "US" });

    expect(americana).not.toBeNull();
    expect(americana).not.toHaveProperty("countryOfOrigin");
  });

  it("descarta registro sem id ou sem título romaji", () =>
  {
    expect(mapearMedia({ ...LOOKISM, id: null })).toBeNull();
    expect(mapearMedia({ ...LOOKISM, title: { romaji: null } })).toBeNull();
    expect(mapearMedia(null)).toBeNull();
    expect(mapearMedia("texto solto")).toBeNull();
  });
});

describe("mapearBusca", () =>
{
  it("extrai a lista da resposta do AniList preservando a ordem", () =>
  {
    const resposta = {
      data: {
        Page: {
          media: [LOOKISM, { ...LOOKISM, id: 105398, title: { romaji: "Solo Leveling" } }],
        },
      },
    };

    expect(mapearBusca(resposta).map(function (m) { return m.anilistId; })).toEqual([
      86848, 105398,
    ]);
  });

  it("descarta os registros inválidos sem derrubar a busca inteira", () =>
  {
    const resposta = {
      data: { Page: { media: [LOOKISM, { ...LOOKISM, format: "MUSIC" }, null] } },
    };

    expect(mapearBusca(resposta)).toHaveLength(1);
  });

  it("devolve lista vazia quando a resposta não tem o formato esperado", () =>
  {
    expect(mapearBusca({})).toEqual([]);
    expect(mapearBusca({ errors: [{ message: "rate limited" }] })).toEqual([]);
    expect(mapearBusca(null)).toEqual([]);
  });
});
