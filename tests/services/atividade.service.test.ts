import { describe, expect, it, vi } from "vitest";
import { feedDaComunidade } from "@/server/services/atividade.service";

// As regras da issue #50: o feed pede as últimas resenhas e as últimas listas
// (cada consulta já limitada), mescla por data e corta em 10. Uma fonte
// falhando não derruba a outra — o feed sai com o que respondeu.

const RESENHA = {
  entryId: "e1",
  username: "leitora",
  chave: "anilist:30002",
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

    // Pede mais do que exibe (#144): o rodízio de autoria precisa ter de onde
    // repor o que descarta.
    expect(deps.listarResenhas).toHaveBeenCalledWith(40);
    expect(deps.listarListas).toHaveBeenCalledWith(40);
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

  // #144: 12 obras na estante e 12 resenhas com texto tomavam o feed inteiro,
  // que ordena estritamente por data. Agora passa pelo rodízio de autoria.
  it("nenhuma conta ocupa o feed: no máximo duas por autor", async function ()
  {
    const listarResenhas = vi.fn(async function ()
    {
      return Array.from({ length: 30 }, function (_, indice)
      {
        return {
          ...RESENHA,
          entryId: `e${indice}`,
          username: indice < 25 ? "spam" : "bia",
          quando: new Date(Date.now() - indice * 1000),
        };
      });
    });

    const feed = await feedDaComunidade({
      listarResenhas,
      listarListas: vi.fn(async function () { return []; }),
    });

    expect(listarResenhas).toHaveBeenCalledWith(40);
    expect(feed.filter(function (item) { return item.username === "spam"; })).toHaveLength(2);
  });

  // O feed é UMA lista, não dois trilhos: o teto tem que valer sobre a mescla.
  // Aplicado por fonte, a mesma conta somava duas resenhas mais duas listas.
  it("duas por autor valem sobre a mescla, não por fonte", async function ()
  {
    const feed = await feedDaComunidade({
      listarResenhas: vi.fn(async function ()
      {
        return Array.from({ length: 5 }, function (_, i)
        {
          return { ...RESENHA, entryId: `e${i}`, username: "spam", quando: new Date(2026, 8, 9, 12, i) };
        });
      }),
      listarListas: vi.fn(async function ()
      {
        return Array.from({ length: 5 }, function (_, i)
        {
          return { ...LISTA, listaId: `l${i}`, username: "spam", quando: new Date(2026, 8, 9, 11, i) };
        });
      }),
    });

    expect(feed.filter(function (item) { return item.username === "spam"; })).toHaveLength(2);
  });
});
