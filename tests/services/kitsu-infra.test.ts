import { afterEach, expect, it, vi } from "vitest";
import { buscarAutorNoKitsu, buscarNoKitsu, buscarNoKitsuPorAnilistId, buscarNoKitsuPorId } from "@/server/infra/kitsu";

afterEach(() => vi.unstubAllGlobals());

it("perfil inexistente no Kitsu é ausência; limite ou falha da fonte não é 404", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 404 })).mockResolvedValueOnce(new Response(null, { status: 429 }));
  vi.stubGlobal("fetch", fetchMock);
  expect(await buscarAutorNoKitsu(1677)).toBeNull();
  await expect(buscarAutorNoKitsu(1677)).rejects.toThrow("429");
  expect(fetchMock.mock.calls[0][0]).toBe("https://kitsu.io/api/edge/people/1677?include=staff.media");
});

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

/**
 * O #240 ensinou que o Kitsu repete linha entre offsets: pedindo "berserk", os
 * offsets 0 e 20 devolvem as mesmas vinte. A #228 ensinou o contrario — contar
 * o que sobrou depois do descarte parava a paginacao cedo demais.
 *
 * O conserto tem que servir aos dois: a fatia se enche com o que a fonte tem de
 * distinto, e `temMais` so promete o que existe. Producao em 11/09 mostrava o
 * lado ruim do acordo antigo: "berserk" devolvia 40 obras com `temMais: true`, e
 * a pagina seguinte vinha vazia.
 */
function loteDoKitsu(ids: number[])
{
  return Response.json({
    data: ids.map((id) => ({
      type: "manga",
      id: String(id),
      attributes: { subtype: "manga", canonicalTitle: `Obra ${id}` },
    })),
  });
}

const vinte = (inicio: number) => Array.from({ length: 20 }, (_, i) => inicio + i);

it("nao promete pagina seguinte quando a fonte so repete o que ja veio", async () => {
  // Tres lotes cheios, mas o segundo e o terceiro repetem o primeiro: e o
  // "berserk" de producao. A fatia rende 20 distintas, nao 60.
  const fetchMock = vi.fn<typeof fetch>(async () => loteDoKitsu(vinte(1)));
  vi.stubGlobal("fetch", fetchMock);

  const pagina = await buscarNoKitsu({ termo: "berserk", ordem: "popular" }, 1);

  expect(pagina.obras).toHaveLength(20);
  expect(pagina.temMais).toBe(false);
});

it("continua paginando quando a fonte tem obra distinta ate o fim da fatia", async () => {
  // Lotes cheios e sem repeticao: a fatia fecha em 60 e ha o que mostrar adiante.
  let chamada = 0;
  const fetchMock = vi.fn<typeof fetch>(async () => loteDoKitsu(vinte(1 + 20 * chamada++)));
  vi.stubGlobal("fetch", fetchMock);

  const pagina = await buscarNoKitsu({ termo: "manga", ordem: "popular" }, 1);

  expect(pagina.obras).toHaveLength(60);
  expect(pagina.temMais).toBe(true);
});

it("preenche a fatia com lotes extras quando parte veio repetida", async () => {
  // Os dois primeiros lotes se repetem; os seguintes trazem obra nova. A fatia
  // tem que chegar em 60 em vez de parar em 40, que era o defeito relatado.
  const lotes = [vinte(1), vinte(1), vinte(21), vinte(41), vinte(61)];
  let chamada = 0;
  const fetchMock = vi.fn<typeof fetch>(async () => loteDoKitsu(lotes[chamada++] ?? []));
  vi.stubGlobal("fetch", fetchMock);

  const pagina = await buscarNoKitsu({ termo: "berserk", ordem: "popular" }, 1);

  expect(pagina.obras).toHaveLength(60);
  expect(pagina.temMais).toBe(true);
});
