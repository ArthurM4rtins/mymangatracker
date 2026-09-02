import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "@/server/repositories/prisma";
import {
  contarCurtidasDadas,
  contarResenhas,
  listarAvaliadas,
  listarResenhasRecentes,
} from "@/server/repositories/perfil.repository";
import { buscarUsuarioPorUsername } from "@/server/repositories/usuario.repository";
import { listarListasDoUsuario } from "@/server/repositories/lista.repository";
import { perfilDoUsuarioDoSistema } from "@/server/services/perfil.service";
import { limparBanco, semearMedia, semearUsuario } from "./apoio";

// As regras da issue #49: o perfil é público, mas o recorte NÃO carrega
// e-mail nem id de usuário; status da estante, progresso, fonte e capítulo só
// saem para o PRÓPRIO dono. O que é de todo mundo: notas, resenhas com texto,
// listas e a contagem de curtidas dadas.

beforeEach(limparBanco);

const SEM_FILTRO = { ordem: "recentes" as const };

async function semearLeitora()
{
  const prisma = getPrisma();
  const dona = await semearUsuario("dona");
  const outra = await semearUsuario("outra");
  const m1 = await semearMedia(30002);
  const m2 = await semearMedia(30013);

  await prisma.shelfEntry.createMany({
    data: [
      { userId: dona.id, mediaId: m1.id, status: "READING", progressChapter: 57.5 },
      { userId: dona.id, mediaId: m2.id, status: "COMPLETED" },
      { userId: outra.id, mediaId: m1.id, status: "PLANNED" },
    ],
  });

  const resenhaDaDona = await prisma.entry.create({
    data: { userId: dona.id, mediaId: m1.id, rating: 5, review: "obra-prima" },
  });
  await prisma.entry.create({
    data: { userId: dona.id, mediaId: m2.id, rating: 4, review: null },
  });
  const resenhaDaOutra = await prisma.entry.create({
    data: { userId: outra.id, mediaId: m1.id, rating: 3, review: "resenha alheia" },
  });

  // A dona curtiu a resenha da outra; a outra curtiu a da dona.
  await prisma.reviewLike.create({ data: { entryId: resenhaDaOutra.id, userId: dona.id } });
  await prisma.reviewLike.create({ data: { entryId: resenhaDaDona.id, userId: outra.id } });

  const fonte = await prisma.readingSource.create({
    data: {
      userId: dona.id,
      mediaId: m1.id,
      sourceHost: "segredo.exemplo",
      urlTemplate: "https://segredo.exemplo/t/{n}",
    },
  });
  await prisma.readingProgress.create({
    data: {
      userId: dona.id,
      mediaId: m1.id,
      readingSourceId: fonte.id,
      chapter: 57.5,
      resolvedUrl: "https://segredo.exemplo/t/57.5",
    },
  });

  await prisma.list.create({ data: { userId: dona.id, nome: "seinen" } });
  await prisma.list.create({ data: { userId: outra.id, nome: "da outra" } });

  return { dona, outra };
}

describe("perfil público", function ()
{
  it("busca por username sem devolver o e-mail", async function ()
  {
    const { dona } = await semearLeitora();

    const usuario = await buscarUsuarioPorUsername("dona");

    expect(usuario).toMatchObject({ id: dona.id, username: "dona" });
    expect(usuario).not.toHaveProperty("email");
    expect(usuario).not.toHaveProperty("passwordHash");
    await expect(buscarUsuarioPorUsername("ninguem")).resolves.toBeNull();
  });

  it("agrega só o que é da usuária: avaliadas, resenhas, curtidas dadas e listas", async function ()
  {
    const { dona } = await semearLeitora();

    const avaliadas = await listarAvaliadas(dona.id);
    expect(avaliadas.map(function (a) { return [a.anilistId, a.rating]; })).toEqual(
      expect.arrayContaining([
        [30002, 5],
        [30013, 4],
      ]),
    );
    expect(avaliadas).toHaveLength(2);

    await expect(contarResenhas(dona.id)).resolves.toBe(1);
    await expect(contarCurtidasDadas(dona.id)).resolves.toBe(1);

    const resenhas = await listarResenhasRecentes(dona.id, 5);
    expect(resenhas.map(function (r) { return r.review; })).toEqual(["obra-prima"]);
    expect(resenhas[0]).toMatchObject({ anilistId: 30002, rating: "5", curtidas: 1 });

    const listas = await listarListasDoUsuario(dona.id);
    expect(listas.map(function (l) { return l.nome; })).toEqual(["seinen"]);
  });

  it("visto por outra pessoa: sem estante, sem status, sem capítulo, sem fonte, sem e-mail", async function ()
  {
    const { dona, outra } = await semearLeitora();

    const perfil = await perfilDoUsuarioDoSistema({
      username: "dona",
      viewerId: outra.id,
      filtro: SEM_FILTRO,
    });
    const serializado = JSON.stringify(perfil);

    expect(perfil).toMatchObject({
      username: "dona",
      souEu: false,
      estante: null,
      numeros: { avaliadas: 2, resenhas: 1, listas: 1, curtidasDadas: 1 },
    });
    expect(serializado).not.toContain("@exemplo.test");
    expect(serializado).not.toContain(dona.id);
    expect(serializado).not.toContain("segredo.exemplo");
    expect(serializado).not.toContain("57.5");
    expect(serializado).not.toContain("READING");
    expect(serializado).not.toContain("progressChapter");
  });

  it("visto pela dona: a estante entra com status e capítulo, fonte continua fora", async function ()
  {
    const { dona } = await semearLeitora();

    const perfil = await perfilDoUsuarioDoSistema({
      username: "dona",
      viewerId: dona.id,
      filtro: SEM_FILTRO,
    });

    expect(perfil?.souEu).toBe(true);
    expect(perfil?.estante?.contagem).toEqual({
      READING: 1,
      COMPLETED: 1,
      PLANNED: 0,
      PAUSED: 0,
      DROPPED: 0,
    });
    expect(perfil?.estante?.entradas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "READING", progressChapter: "57.5" }),
      ]),
    );
    expect(JSON.stringify(perfil)).not.toContain("segredo.exemplo");
    expect(JSON.stringify(perfil)).not.toContain(dona.id);
  });
});
