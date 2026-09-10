import { describe, expect, it } from "vitest";

import {
  caminhoDaObra,
  interpretarReferencia,
  referenciaDeMedia,
  type ReferenciaDaObra,
} from "@/server/domain/referencia-da-obra";

/**
 * A obra deixa de ser identificada só pelo AniList (#254).
 *
 * O que motivou: buscando "The Beginning After The End" em 10/09/2026, o Kitsu
 * devolve três registros e NENHUM tem mapeamento para o AniList. Como toda obra
 * era identificada por `anilistId`, os três eram descartados e a obra não
 * existia no Kidoku. Medido no mesmo dia, some 75% do resultado de "omniscient
 * reader" e 40% do de "tower of god" — justamente o manhwa coreano.
 */
describe("interpretarReferencia", function ()
{
  it("aceita as duas fontes que existem", function ()
  {
    expect(interpretarReferencia("anilist", "30002")).toEqual({ fonte: "anilist", id: 30002 });
    expect(interpretarReferencia("kitsu", "54598")).toEqual({ fonte: "kitsu", id: 54598 });
  });

  it("recusa fonte desconhecida, em vez de confiar no que veio da URL", function ()
  {
    expect(interpretarReferencia("mangadex", "1")).toBeNull();
    expect(interpretarReferencia("", "1")).toBeNull();
  });

  it("recusa id que nao e inteiro positivo", function ()
  {
    expect(interpretarReferencia("anilist", "0")).toBeNull();
    expect(interpretarReferencia("anilist", "-5")).toBeNull();
    expect(interpretarReferencia("anilist", "3.5")).toBeNull();
    expect(interpretarReferencia("anilist", "abc")).toBeNull();
    expect(interpretarReferencia("anilist", "")).toBeNull();
  });

  // A URL antiga e `/obra/30002`, sem fonte. Continua valendo como AniList,
  // senao todo link e favorito ja existente quebraria.
  it("segmento sozinho e numerico continua sendo AniList", function ()
  {
    expect(interpretarReferencia("30002")).toEqual({ fonte: "anilist", id: 30002 });
  });

  it("segmento sozinho nao numerico nao vira referencia", function ()
  {
    expect(interpretarReferencia("kitsu")).toBeNull();
  });
});

describe("caminhoDaObra", function ()
{
  it("monta o caminho com a fonte na frente", function ()
  {
    expect(caminhoDaObra({ fonte: "anilist", id: 30002 })).toBe("/obra/anilist/30002");
    expect(caminhoDaObra({ fonte: "kitsu", id: 54598 })).toBe("/obra/kitsu/54598");
  });

  it("ida e volta: o caminho gerado e lido de volta igual", function ()
  {
    const referencias: ReferenciaDaObra[] = [
      { fonte: "anilist", id: 1 },
      { fonte: "kitsu", id: 999999 },
    ];

    for (const referencia of referencias)
    {
      const [, , fonte, id] = caminhoDaObra(referencia).split("/");

      expect(interpretarReferencia(fonte, id)).toEqual(referencia);
    }
  });
});

describe("referenciaDeMedia", function ()
{
  it("com os dois ids, o AniList manda: e o nome canonico da obra", function ()
  {
    expect(referenciaDeMedia({ anilistId: 30002, kitsuId: 8 }))
      .toEqual({ fonte: "anilist", id: 30002 });
  });

  it("so com Kitsu, a referencia e do Kitsu", function ()
  {
    expect(referenciaDeMedia({ anilistId: null, kitsuId: 54598 }))
      .toEqual({ fonte: "kitsu", id: 54598 });
  });

  it("so com AniList, a referencia e do AniList", function ()
  {
    expect(referenciaDeMedia({ anilistId: 30002, kitsuId: null }))
      .toEqual({ fonte: "anilist", id: 30002 });
  });

  // O CHECK da migration impede isso no banco; aqui e a rede de baixo, para o
  // tipo nao mentir que sempre ha referencia.
  it("sem nenhum dos dois nao ha referencia", function ()
  {
    expect(referenciaDeMedia({ anilistId: null, kitsuId: null })).toBeNull();
  });
});
