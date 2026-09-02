import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "@/server/repositories/prisma";
import { listarResenhasDaComunidade } from "@/server/repositories/atividade.repository";
import { listarListasPublicas } from "@/server/repositories/lista.repository";
import { limparBanco, semearMedia, semearUsuario } from "./apoio";

// O feed da comunidade (issue #50): resenhas COM TEXTO de todo mundo, mais
// recente primeiro, com username e obra — e-mail e ids de usuário nunca.
// Nota sem texto fica fora. Progresso e fonte não entram.

beforeEach(limparBanco);

describe("listarResenhasDaComunidade", function ()
{
  it("só resenhas com texto, mais recente primeiro, sem e-mail nem ids", async function ()
  {
    const prisma = getPrisma();
    const ana = await semearUsuario("ana");
    const bia = await semearUsuario("bia");
    const m1 = await semearMedia(30002);
    const m2 = await semearMedia(30013);

    await prisma.entry.create({
      data: { userId: ana.id, mediaId: m1.id, rating: 5, review: "antiga", reviewedAt: new Date("2026-09-01T10:00:00Z") },
    });
    await prisma.entry.create({
      data: { userId: bia.id, mediaId: m1.id, rating: 4, review: "recente", containsSpoilers: true, reviewedAt: new Date("2026-09-02T10:00:00Z") },
    });
    await prisma.entry.create({
      data: { userId: ana.id, mediaId: m2.id, rating: 3, review: null },
    });
    await prisma.readingProgress.create({
      data: { userId: ana.id, mediaId: m1.id, chapter: 57.5, resolvedUrl: "https://segredo.exemplo/57.5" },
    });

    const resenhas = await listarResenhasDaComunidade(10);

    expect(resenhas.map(function (r) { return [r.username, r.review]; })).toEqual([
      ["bia", "recente"],
      ["ana", "antiga"],
    ]);
    expect(resenhas[0]).toMatchObject({ anilistId: 30002, containsSpoilers: true, rating: "4", curtidas: 0 });

    const serializado = JSON.stringify(resenhas);
    expect(serializado).not.toContain("@exemplo.test");
    expect(serializado).not.toContain(ana.id);
    expect(serializado).not.toContain("segredo.exemplo");
    expect(serializado).not.toContain("57.5");

    expect(await listarResenhasDaComunidade(1)).toHaveLength(1);
  });

  it("listas públicas carregam a data de criação para o feed ordenar", async function ()
  {
    const ana = await semearUsuario("ana");
    await getPrisma().list.create({ data: { userId: ana.id, nome: "seinen" } });

    const listas = await listarListasPublicas(10);

    expect(listas[0]?.criadaEm).toBeInstanceOf(Date);
    expect(JSON.stringify(listas)).not.toContain(ana.id);
  });
});
