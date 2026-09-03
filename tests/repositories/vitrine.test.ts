import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "@/server/repositories/prisma";
import { listarResenhasMaisCurtidas } from "@/server/repositories/atividade.repository";
import { listarListasMaisCurtidas } from "@/server/repositories/lista.repository";
import { limparBanco, semearMedia, semearUsuario } from "./apoio";

// Issue #76: "mais curtidas" conta só as curtidas DADAS na janela — uma
// resenha antiga com muita curtida velha não aparece; a que foi curtida esta
// semana sim. Ordem pelo total na janela. Recorte público, como o feed.

beforeEach(limparBanco);

const HA_10_DIAS = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
const HA_7_DIAS = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

describe("listarResenhasMaisCurtidas", function ()
{
  it("ordena pelas curtidas dadas na janela e ignora as antigas", async function ()
  {
    const prisma = getPrisma();
    const autora = await semearUsuario("autora");
    const fas = await Promise.all(["f1", "f2", "f3"].map(semearUsuario));
    const m1 = await semearMedia(1);
    const m2 = await semearMedia(2);
    const m3 = await semearMedia(3);
    const velha = await prisma.entry.create({ data: { userId: autora.id, mediaId: m1.id, review: "velha" } });
    const quente = await prisma.entry.create({ data: { userId: autora.id, mediaId: m2.id, review: "quente" } });
    const morna = await prisma.entry.create({ data: { userId: autora.id, mediaId: m3.id, review: "morna" } });

    // velha: 3 curtidas de 10 dias atrás. quente: 2 nesta semana. morna: 1.
    for (const fa of fas)
    {
      await prisma.reviewLike.create({ data: { entryId: velha.id, userId: fa.id, createdAt: HA_10_DIAS } });
    }
    await prisma.reviewLike.create({ data: { entryId: quente.id, userId: fas[0].id } });
    await prisma.reviewLike.create({ data: { entryId: quente.id, userId: fas[1].id } });
    await prisma.reviewLike.create({ data: { entryId: morna.id, userId: fas[0].id } });

    const resenhas = await listarResenhasMaisCurtidas(HA_7_DIAS, 10);

    expect(resenhas.map(function (r) { return r.review; })).toEqual(["quente", "morna"]);
    expect(resenhas[0]).not.toHaveProperty("email");
    expect(resenhas[0].username).toBe("autora");
  });

  it("sem curtida na janela é vazio", async function ()
  {
    expect(await listarResenhasMaisCurtidas(HA_7_DIAS, 10)).toEqual([]);
  });
});

describe("listarListasMaisCurtidas", function ()
{
  it("ordena pelas curtidas dadas na janela", async function ()
  {
    const prisma = getPrisma();
    const dona = await semearUsuario("dona");
    const fas = await Promise.all(["f1", "f2"].map(semearUsuario));
    const l1 = await prisma.list.create({ data: { userId: dona.id, nome: "um" } });
    const l2 = await prisma.list.create({ data: { userId: dona.id, nome: "dois" } });
    await prisma.listLike.create({ data: { listId: l1.id, userId: fas[0].id, createdAt: HA_10_DIAS } });
    await prisma.listLike.create({ data: { listId: l2.id, userId: fas[0].id } });
    await prisma.listLike.create({ data: { listId: l2.id, userId: fas[1].id } });
    await prisma.listLike.create({ data: { listId: l1.id, userId: fas[1].id } });

    const listas = await listarListasMaisCurtidas(HA_7_DIAS, 10);

    expect(listas.map(function (l) { return l.nome; })).toEqual(["dois", "um"]);
    expect(listas[0].username).toBe("dona");
  });
});
