import { describe, expect, it } from "vitest";
import { mapearAutorDoKitsu } from "@/server/domain/kitsu-autor";
import { caminhoDoAutor, interpretarReferenciaDeAutor } from "@/server/domain/referencia-de-autor";

describe("perfil de autor do Kitsu", () => {
  const vinculo = (id: string, papel: string, tipo: string, obra: string) => ({ type: "mediaStaff", id, attributes: { role: papel }, relationships: { media: { data: { type: tipo, id: obra } } } });
  const resposta = {
    data: { type: "people", id: "1677", attributes: { name: "Kentarou Miura", description: "<p>Uma <i>biografia</i>.</p>", image: { medium: "https://media.kitsu.app/pessoa.jpg" } }, relationships: { staff: { data: ["1", "2", "3", "4", "5"].map(id => ({ type: "mediaStaff", id })) } } },
    included: [
      vinculo("1", "Art Assistant", "manga", "8"),
      vinculo("2", "Story & Art", "manga", "8"),
      vinculo("3", "Story", "manga", "9"),
      vinculo("4", "Original Creator", "anime", "8"),
      vinculo("5", "Art", "manga", "8"),
      vinculo("6", "Story", "manga", "10"),
      { type: "manga", id: "8", attributes: { subtype: "manga", canonicalTitle: "Berserk", startDate: "1989-08-25", userCount: 100 } },
      { type: "manga", id: "9", attributes: { subtype: "novel", canonicalTitle: "Novel", userCount: 10 } },
      { type: "anime", id: "8", attributes: { canonicalTitle: "Anime" } },
      { type: "manga", id: "10", attributes: { subtype: "manga", canonicalTitle: "Outra pessoa" } },
    ],
  };

  it("importa foto, biografia limpa e somente as obras de autoria vinculadas", () => {
    const autor = mapearAutorDoKitsu(resposta);
    expect(autor).toMatchObject({ kitsuPersonId: 1677, nome: "Kentarou Miura", nomeNativo: null, imagemUrl: "https://media.kitsu.app/pessoa.jpg", descricao: "Uma biografia." });
    expect(autor?.obras.map(o => o.chave)).toEqual(["kitsu:8", "kitsu:9"]);
    expect(autor?.obras[0].papel).toBe("Story & Art");
    expect(autor).not.toHaveProperty("staffId");
  });

  it("aceita perfil sem foto, biografia ou obras, mas recusa identidade inválida", () => {
    expect(mapearAutorDoKitsu({ data: { type: "people", id: "1", attributes: { name: "Autora" } } })).toMatchObject({ imagemUrl: null, descricao: null, obras: [] });
    expect(mapearAutorDoKitsu({ data: { type: "people", id: "-1", attributes: { name: "Autora" } } })).toBeNull();
    expect(mapearAutorDoKitsu({ data: null })).toBeNull();
  });
});

it("preserva URLs antigas e distingue IDs de pessoas entre as fontes", () => {
  expect(interpretarReferenciaDeAutor(["96911"])).toEqual({ fonte: "anilist", id: 96911 });
  expect(interpretarReferenciaDeAutor(["kitsu", "1677"])).toEqual({ fonte: "kitsu", id: 1677 });
  expect(interpretarReferenciaDeAutor(["kitsu", "1", "extra"])).toBeNull();
  expect(interpretarReferenciaDeAutor(["kitsu", "9007199254740992"])).toBeNull();
  expect(interpretarReferenciaDeAutor(["invalid", "1"])).toBeNull();
  expect(caminhoDoAutor({ kitsuPersonId: 1677 })).toBe("/autor/kitsu/1677");
  expect(caminhoDoAutor({ anilistStaffId: 96911 })).toBe("/autor/96911");
  expect(caminhoDoAutor({ anilistStaffId: 96911, kitsuPersonId: 1677 })).toBe("/autor/kitsu/1677");
});
