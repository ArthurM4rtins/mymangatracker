import { describe, expect, it, vi } from "vitest";
import { feedDaComunidade } from "@/server/services/atividade.service";

// As regras da issue #50: o feed pede as últimas resenhas e as últimas listas
// (cada consulta já limitada), mescla por data e corta em 10. Uma fonte
// falhando não derruba a outra — o feed sai com o que respondeu.

const RESENHA = {
  entryId: "e1",
  username: "leitora",
  anilistId: 30002,
  titulo: "Berserk",
  coverImageUrl: null,
  rating: "5",
  review: "obra-prima",
  containsSpoilers: false,
  curtidas: 2,
  quando: new Date("2026-09-02T10:00:00Z"),
};

const LISTA = {
  listaId: "l1",
  username: "outro",
  nome: "seinen",
  totalDeObras: 3,
  capas: [],
  curtidas: 0,
  quando: new Date("2026-09-02T11:00:00Z"),
};

function fakeDeps(cenario: { resenhasFora?: boolean; listasFora?: boolean })
{
  return {
    listarResenhas: vi.fn(async function ()
    {
      if (cenario.resenhasFora)
      {
        throw new Error("fora");
      }
      return [RESENHA];
    }),
    listarListas: vi.fn(async function ()
    {
      if (cenario.listasFora)
      {
        throw new Error("fora");
      }
      return [LISTA];
    }),
  };
}

describe("feedDaComunidade", function ()
{
  it("mescla resenhas e listas, mais recente primeiro, pedindo 10 de cada", async function ()
  {
    const deps = fakeDeps({});

    const feed = await feedDaComunidade(deps);

    expect(deps.listarResenhas).toHaveBeenCalledWith(10);
    expect(deps.listarListas).toHaveBeenCalledWith(10);
    expect(feed.map(function (item) { return item.tipo; })).toEqual(["lista", "resenha"]);
    expect(feed[1]).toMatchObject({ tipo: "resenha", username: "leitora", titulo: "Berserk" });
  });

  it("resenhas fora: o feed sai só com as listas", async function ()
  {
    const feed = await feedDaComunidade(fakeDeps({ resenhasFora: true }));

    expect(feed.map(function (item) { return item.tipo; })).toEqual(["lista"]);
  });

  it("listas fora: o feed sai só com as resenhas", async function ()
  {
    const feed = await feedDaComunidade(fakeDeps({ listasFora: true }));

    expect(feed.map(function (item) { return item.tipo; })).toEqual(["resenha"]);
  });
});
