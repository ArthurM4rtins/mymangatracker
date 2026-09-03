import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "@/server/repositories/prisma";
import { listarListasPublicas } from "@/server/repositories/lista.repository";
import { limparBanco, semearUsuario } from "./apoio";

// Issue #80: /listas ordena por curtidas acumuladas, empate pela criação.

beforeEach(limparBanco);

describe("listarListasPublicas por curtidas", function ()
{
  it("ordena pelo total de curtidas e desempata pela mais recente", async function ()
  {
    const prisma = getPrisma();
    const dona = await semearUsuario("dona");
    const fas = await Promise.all(["f1", "f2"].map(semearUsuario));
    const antiga = await prisma.list.create({ data: { userId: dona.id, nome: "antiga", createdAt: new Date("2026-08-01") } });
    const nova = await prisma.list.create({ data: { userId: dona.id, nome: "nova", createdAt: new Date("2026-09-01") } });
    const top = await prisma.list.create({ data: { userId: dona.id, nome: "top", createdAt: new Date("2026-07-01") } });
    await prisma.listLike.create({ data: { listId: top.id, userId: fas[0].id } });
    await prisma.listLike.create({ data: { listId: top.id, userId: fas[1].id } });
    await prisma.listLike.create({ data: { listId: antiga.id, userId: fas[0].id } });
    await prisma.listLike.create({ data: { listId: nova.id, userId: fas[0].id } });

    const porCurtidas = await listarListasPublicas(10, "curtidas");
    const porData = await listarListasPublicas(10);

    expect(porCurtidas.map(function (l) { return l.nome; })).toEqual(["top", "nova", "antiga"]);
    expect(porData.map(function (l) { return l.nome; })).toEqual(["nova", "antiga", "top"]);
  });
});
