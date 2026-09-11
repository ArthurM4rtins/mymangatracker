import { afterEach, expect, it, vi } from "vitest";
import { buscarNoKitsuPorAnilistId, buscarNoKitsuPorId } from "@/server/infra/kitsu";

afterEach(() => vi.unstubAllGlobals());

it("resolve o mapeamento da própria obra, mesmo com outro mapeamento incluído antes", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json({
    data: { type: "manga", id: "8", attributes: { subtype: "manga", canonicalTitle: "Berserk" }, relationships: { mappings: { data: [{ type: "mappings", id: "2" }] } } },
    included: [
      { type: "mappings", id: "1", attributes: { externalSite: "anilist/manga", externalId: "999" } },
      { type: "mappings", id: "2", attributes: { externalSite: "anilist/manga", externalId: "30002" } },
    ],
  }));
  vi.stubGlobal("fetch", fetchMock);
  const obra = await buscarNoKitsuPorId(8);
  expect(obra).toMatchObject({ kitsuId: 8, anilistId: 30002, details: { version: 1 } });
  expect(String(fetchMock.mock.calls[0]?.[0])).toContain("staff.person");
});

it("segue o item do mapeamento AniList, sem confundir uma obra relacionada", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({
    data: [{ type: "mappings", id: "2", relationships: { item: { data: { type: "manga", id: "8" } } } }],
    included: [
      { type: "manga", id: "9", attributes: { subtype: "novel", canonicalTitle: "Outra obra" } },
      { type: "manga", id: "8", attributes: { subtype: "manga", canonicalTitle: "Berserk" } },
    ],
  })).mockResolvedValueOnce(Response.json({ data: { type: "manga", id: "8", attributes: { subtype: "manga", canonicalTitle: "Berserk" } } }));
  vi.stubGlobal("fetch", fetchMock);
  expect(await buscarNoKitsuPorAnilistId(30002)).toMatchObject({ kitsuId: 8, anilistId: 30002, titleRomaji: "Berserk", details: { version: 1 } });
  expect(fetchMock.mock.calls[1][0]).toContain("/manga/8?include=");
});
