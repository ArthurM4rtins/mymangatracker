import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "@/server/repositories/prisma";
import {
  alternarCurtidaDoPerfil,
  alternarSeguir,
  resumoSocial,
} from "@/server/repositories/social.repository";
import { limparBanco, semearUsuario } from "./apoio";

// A migration follow_profile_like (issue #74): um vínculo por par, a si mesmo
// não (CHECK no banco, não só no código), e apagar qualquer dos dois usuários
// leva o vínculo junto.

beforeEach(limparBanco);

describe("Follow e ProfileLike (migration follow_profile_like)", function ()
{
  it("são únicos por par", async function ()
  {
    const prisma = getPrisma();
    const a = await semearUsuario("a");
    const b = await semearUsuario("b");

    await prisma.follow.create({ data: { followerId: a.id, followingId: b.id } });
    await prisma.profileLike.create({ data: { userId: a.id, profileUserId: b.id } });

    await expect(
      prisma.follow.create({ data: { followerId: a.id, followingId: b.id } }),
    ).rejects.toMatchObject({ code: "P2002" });
    await expect(
      prisma.profileLike.create({ data: { userId: a.id, profileUserId: b.id } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("o banco recusa seguir ou curtir a si mesmo", async function ()
  {
    const prisma = getPrisma();
    const a = await semearUsuario("a");

    await expect(
      prisma.follow.create({ data: { followerId: a.id, followingId: a.id } }),
    ).rejects.toThrow(/Follow_nao_a_si_mesmo/);
    await expect(
      prisma.profileLike.create({ data: { userId: a.id, profileUserId: a.id } }),
    ).rejects.toThrow(/ProfileLike_nao_a_si_mesmo/);
  });

  it("somem junto com qualquer dos dois usuários", async function ()
  {
    const prisma = getPrisma();
    const a = await semearUsuario("a");
    const b = await semearUsuario("b");
    const c = await semearUsuario("c");
    await prisma.follow.create({ data: { followerId: a.id, followingId: b.id } });
    await prisma.follow.create({ data: { followerId: c.id, followingId: a.id } });
    await prisma.profileLike.create({ data: { userId: a.id, profileUserId: b.id } });
    await prisma.profileLike.create({ data: { userId: c.id, profileUserId: a.id } });

    await prisma.user.delete({ where: { id: b.id } });
    expect(await prisma.follow.count()).toBe(1);
    expect(await prisma.profileLike.count()).toBe(1);

    await prisma.user.delete({ where: { id: a.id } });
    expect(await prisma.follow.count()).toBe(0);
    expect(await prisma.profileLike.count()).toBe(0);
  });
});

describe("social.repository", function ()
{
  it("seguir é toggle e devolve o total de seguidores do alvo", async function ()
  {
    const a = await semearUsuario("a");
    const b = await semearUsuario("b");
    const c = await semearUsuario("c");

    expect(await alternarSeguir(a.id, b.id)).toEqual({ ativo: true, total: 1 });
    expect(await alternarSeguir(c.id, b.id)).toEqual({ ativo: true, total: 2 });
    expect(await alternarSeguir(a.id, b.id)).toEqual({ ativo: false, total: 1 });
  });

  it("curtir perfil é toggle e devolve o total do perfil", async function ()
  {
    const a = await semearUsuario("a");
    const b = await semearUsuario("b");

    expect(await alternarCurtidaDoPerfil(a.id, b.id)).toEqual({ ativo: true, total: 1 });
    expect(await alternarCurtidaDoPerfil(a.id, b.id)).toEqual({ ativo: false, total: 0 });
  });

  it("alvo inexistente ou a si mesmo é null, sem exceção", async function ()
  {
    const a = await semearUsuario("a");

    expect(await alternarSeguir(a.id, "nao-existe")).toBeNull();
    expect(await alternarSeguir(a.id, a.id)).toBeNull();
    expect(await alternarCurtidaDoPerfil(a.id, a.id)).toBeNull();
  });

  it("resumo traz os números e o estado de quem olha", async function ()
  {
    const a = await semearUsuario("a");
    const b = await semearUsuario("b");
    const c = await semearUsuario("c");
    await alternarSeguir(a.id, b.id);
    await alternarSeguir(c.id, b.id);
    await alternarSeguir(b.id, a.id);
    await alternarCurtidaDoPerfil(a.id, b.id);

    expect(await resumoSocial(b.id, a.id)).toEqual({
      seguidores: 2,
      seguindo: 1,
      curtidas: 1,
      sigo: true,
      curti: true,
    });
    expect(await resumoSocial(b.id, c.id)).toMatchObject({ sigo: true, curti: false });
    expect(await resumoSocial(b.id, null)).toMatchObject({ sigo: false, curti: false });
  });
});
