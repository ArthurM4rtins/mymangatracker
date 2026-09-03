import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "@/server/repositories/prisma";
import { limparBanco, semearUsuario } from "./apoio";

// A migration do ListLike (issue #51): uma curtida por (lista, usuário) —
// a segunda estoura no banco, não no código; apagar a lista leva as
// curtidas junto (Cascade), apagar o usuário também.

beforeEach(limparBanco);

describe("ListLike (migration list_like)", function ()
{
  it("é única por lista e usuário", async function ()
  {
    const prisma = getPrisma();
    const dona = await semearUsuario("dona");
    const fa = await semearUsuario("fa");
    const lista = await prisma.list.create({ data: { userId: dona.id, nome: "seinen" } });

    await prisma.listLike.create({ data: { listId: lista.id, userId: fa.id } });

    await expect(
      prisma.listLike.create({ data: { listId: lista.id, userId: fa.id } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("some junto com a lista e junto com o usuário", async function ()
  {
    const prisma = getPrisma();
    const dona = await semearUsuario("dona");
    const fa = await semearUsuario("fa");
    const l1 = await prisma.list.create({ data: { userId: dona.id, nome: "um" } });
    const l2 = await prisma.list.create({ data: { userId: dona.id, nome: "dois" } });
    await prisma.listLike.create({ data: { listId: l1.id, userId: fa.id } });
    await prisma.listLike.create({ data: { listId: l2.id, userId: fa.id } });

    await prisma.list.delete({ where: { id: l1.id } });
    expect(await prisma.listLike.count()).toBe(1);

    await prisma.user.delete({ where: { id: fa.id } });
    expect(await prisma.listLike.count()).toBe(0);
  });
});
