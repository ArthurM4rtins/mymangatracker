import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "@/server/repositories/prisma";
import {
  contarAvaliacoes,
  contarEstantePorStatus,
  listarResenhasRecentes,
} from "@/server/repositories/perfil.repository";
import { buscarUsuarioPorUsername } from "@/server/repositories/usuario.repository";
import { listarListasDoUsuario } from "@/server/repositories/lista.repository";
import { perfilPublicoDoSistema } from "@/server/services/perfil.service";
import { limparBanco, semearMedia, semearUsuario } from "./apoio";

// As regras da issue #49: o perfil é público, mas o recorte NÃO carrega
// e-mail, id de usuário, progresso, fonte nem capítulo. Estante só em
// contagens; resenhas só com texto; listas do próprio usuário.

beforeEach(limparBanco);

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

  await prisma.entry.createMany({
    data: [
      { userId: dona.id, mediaId: m1.id, rating: 5, review: "obra-prima" },
      { userId: dona.id, mediaId: m2.id, rating: 4, review: null },
      { userId: outra.id, mediaId: m1.id, rating: 3, review: "resenha alheia" },
    ],
  });

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

  it("agrega só o que é da usuária: contagens, resenhas com texto e listas", async function ()
  {
    const { dona } = await semearLeitora();

    const porStatus = await contarEstantePorStatus(dona.id);
    expect(porStatus).toEqual(
      expect.arrayContaining([
        { status: "READING", total: 1 },
        { status: "COMPLETED", total: 1 },
      ]),
    );
    expect(porStatus).toHaveLength(2);

    await expect(contarAvaliacoes(dona.id)).resolves.toBe(2);

    const resenhas = await listarResenhasRecentes(dona.id, 5);
    expect(resenhas.map(function (r) { return r.review; })).toEqual(["obra-prima"]);
    expect(resenhas[0]).toMatchObject({ anilistId: 30002, rating: "5", curtidas: 0 });

    const listas = await listarListasDoUsuario(dona.id);
    expect(listas.map(function (l) { return l.nome; })).toEqual(["seinen"]);
  });

  it("o perfil composto nunca vaza e-mail, id, fonte, progresso nem capítulo", async function ()
  {
    const { dona } = await semearLeitora();

    const perfil = await perfilPublicoDoSistema("dona");
    const serializado = JSON.stringify(perfil);

    expect(perfil).toMatchObject({
      username: "dona",
      totalNaEstante: 2,
      avaliacoes: 2,
    });
    expect(serializado).not.toContain("@exemplo.test");
    expect(serializado).not.toContain(dona.id);
    expect(serializado).not.toContain("segredo.exemplo");
    expect(serializado).not.toContain("57.5");
    expect(serializado).not.toContain("resolvedUrl");
    expect(serializado).not.toContain("progressChapter");
  });
});
