import { describe, expect, it } from "vitest";
import { traduzirDoKitsu } from "@/server/domain/kitsu-media";
import { interpretarFiltros, temFiltroAtivo } from "@/server/domain/catalogo-filtros";
import { consultaDoKitsu } from "@/server/domain/kitsu-filtros";
import { mapearMedia } from "@/server/domain/anilist-media";
import { mesclarDetalhes } from "@/server/domain/detalhes-da-obra";

describe("ficha enriquecida do Kitsu", () => {
  it("importa metadados e resolve somente os relacionamentos da obra", () => {
    const obra = traduzirDoKitsu({
      anilistId: null,
      completo: true,
      dados: {
        id: "8", attributes: {
          canonicalTitle: "Obra", subtype: "manga", status: "finished",
          volumeCount: 3, startDate: "2000-01-02", endDate: "2001-03-04",
          titles: { en: "Work", ja_jp: "作品" }, abbreviatedTitles: ["Work", "Alias"],
          coverImage: { large_webp: "https://media.kitsu.app/banner.webp" },
        },
        relationships: {
          categories: { data: [{ type: "categories", id: "1" }] },
          staff: { data: [{ type: "mediaStaff", id: "2" }] },
          mediaRelationships: { data: [{ type: "mediaRelationships", id: "3" }, { type: "mediaRelationships", id: "4" }] },
        },
      },
      incluidos: [
        { type: "categories", id: "1", attributes: { slug: "action", title: "Action" } },
        { type: "categories", id: "99", attributes: { slug: "romance", title: "Romance" } },
        { type: "mediaStaff", id: "2", attributes: { role: "Story & Art" }, relationships: { person: { data: { type: "people", id: "20" } } } },
        { type: "people", id: "20", attributes: { name: "Autora" } },
        { type: "mediaRelationships", id: "3", attributes: { role: "sequel" }, relationships: { destination: { data: { type: "manga", id: "9" } } } },
        { type: "mediaRelationships", id: "4", attributes: { role: "adaptation" }, relationships: { destination: { data: { type: "anime", id: "9" } } } },
        { type: "manga", id: "9", attributes: { canonicalTitle: "Continuação", subtype: "novel" } },
        { type: "anime", id: "9", attributes: { canonicalTitle: "Anime" } },
      ],
    });
    expect(obra?.bannerImageUrl).toBe("https://media.kitsu.app/banner.webp");
    expect(obra?.genres).toEqual(["Action"]);
    expect(obra?.autores).toEqual([{ kitsuPersonId: 20, nome: "Autora", papel: "Story & Art" }]);
    expect(obra?.details).toMatchObject({ version: 1, status: "finished", volumes: 3, startDate: "2000-01-02", endDate: "2001-03-04", aliases: ["Work", "作品", "Alias"], categories: ["action"] });
    expect(obra?.details?.related).toEqual([{ chave: "kitsu:9", titulo: "Continuação", capa: null, tipo: "NOVEL", relacao: "sequel" }]);
  });

  it("não inventa volumes, datas nem detalhes completos na listagem", () => {
    const obra = traduzirDoKitsu({ anilistId: null, dados: { id: "8", attributes: { canonicalTitle: "Obra", subtype: "manga", volumeCount: 0, startDate: "2000-02-31", status: "unknown" } } });
    expect(obra?.details).toBeUndefined();
  });
});

describe("novos filtros", () => {
  it("valida temas/status e leituras curtas implicam obra concluída", () => {
    const filtro = interpretarFiltros({ tema: "military", publicacao: "current", curtas: "1" });
    expect(filtro).toMatchObject({ tema: "military", publicacao: "finished", curtas: true });
    expect(temFiltroAtivo(filtro)).toBe(true);
    expect(consultaDoKitsu(filtro)).toMatchObject({ categoria: "military", status: "finished", capitulos: "1..30" });
    expect(interpretarFiltros({ tema: "invalid", publicacao: "invalid", curtas: "true" })).toEqual({ termo: "", ordem: "popular" });
  });
});

it("fallback AniList também traduz publicação sem inventar datas incompletas", () => {
  expect(mapearMedia({ id: 1, title: { romaji: "Obra" }, format: "MANGA", status: "HIATUS", volumes: 4, startDate: { year: 2000 }, endDate: { year: 2001, month: 2, day: 3 }, synonyms: ["Alias"] })?.details)
    .toEqual({ version: 1, status: "hiatus", volumes: 4, endDate: "2001-02-03", aliases: ["Alias"], categories: [], related: [] });
});

it("atualização parcial preserva categorias e relações conhecidas no cache", () => {
  const antigo = { version: 1 as const, categories: ["military"], related: [], aliases: ["Alias"], volumes: 3 };
  const novo = { version: 1 as const, categories: [], related: [], aliases: [], status: "finished" as const };
  expect(mesclarDetalhes(antigo, novo)).toEqual({ ...antigo, status: "finished" });
});
