import { beforeEach, expect, it } from "vitest";
import { buscarMediaCompletaPorReferencia, buscarMediasEmCache, salvarMediaDoAniList } from "@/server/repositories/media.repository";
import { limparBanco } from "./apoio";

beforeEach(limparBanco);

it("persiste a ficha e os autores Kitsu, preservando-os na atualização parcial", async () => {
  const base = { kitsuId: 8, anilistId: 30002, titleRomaji: "Obra", type: "MANGA" as const };
  const details = { version: 1 as const, aliases: ["Alias"], categories: ["military"], related: [], status: "finished" as const, volumes: 2, subtype: "manga" };
  await salvarMediaDoAniList({ ...base, chapters: 12, details, autores: [{ kitsuPersonId: 2, nome: "Autora", papel: "Story" }] }, new Date());
  await salvarMediaDoAniList({ ...base, details: { version: 1, aliases: [], categories: [], related: [] } }, new Date());
  const lida = await buscarMediaCompletaPorReferencia({ fonte: "kitsu", id: 8 });
  expect(lida?.details).toEqual(details);
  expect(lida?.autores).toEqual([{ kitsuPersonId: 2, nome: "Autora", papel: "Story" }]);
  const filtro = { termo: "", ordem: "popular" as const, publicacao: "finished" as const, curtas: true as const, tema: "military" as const };
  expect(await buscarMediasEmCache("", 1, filtro)).toHaveLength(1);
  expect(await buscarMediasEmCache("", 1, { ...filtro, tipo: "manga" })).toHaveLength(1);
  expect(await buscarMediasEmCache("", 1, { ...filtro, tema: "revenge" })).toHaveLength(0);
  expect(await buscarMediasEmCache("", 1, { ...filtro, publicacao: "current" })).toHaveLength(0);
});
