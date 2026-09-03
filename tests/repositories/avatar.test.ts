import { beforeEach, describe, expect, it } from "vitest";
import {
  apagarAvatar,
  buscarAvatarPorUsername,
  buscarUsuarioPorId,
  buscarUsuarioPorUsername,
  salvarAvatar,
} from "@/server/repositories/usuario.repository";
import { limparBanco, semearUsuario } from "./apoio";

// Issue #76: os bytes da foto só saem por buscarAvatarPorUsername. As
// leituras de usuário que já existiam continuam sem avatar, sem hash.

beforeEach(limparBanco);

describe("avatar no usuario.repository", function ()
{
  it("salva, lê por username e apaga", async function ()
  {
    const u = await semearUsuario("leitora");
    const bytes = new Uint8Array([255, 216, 255, 224]);

    const { avatarUpdatedAt } = await salvarAvatar(u.id, "image/jpeg", bytes);
    expect(avatarUpdatedAt).toBeInstanceOf(Date);

    const foto = await buscarAvatarPorUsername("leitora");
    expect(foto?.mime).toBe("image/jpeg");
    expect(Array.from(foto?.bytes ?? [])).toEqual([255, 216, 255, 224]);
    expect((await buscarUsuarioPorUsername("leitora"))?.avatarUpdatedAt?.getTime()).toBe(
      avatarUpdatedAt.getTime(),
    );

    await apagarAvatar(u.id);
    expect(await buscarAvatarPorUsername("leitora")).toBeNull();
    expect((await buscarUsuarioPorUsername("leitora"))?.avatarUpdatedAt).toBeNull();
  });

  it("sem foto ou sem usuário é null", async function ()
  {
    await semearUsuario("semfoto");

    expect(await buscarAvatarPorUsername("semfoto")).toBeNull();
    expect(await buscarAvatarPorUsername("ninguem")).toBeNull();
  });

  it("os bytes não vazam nas leituras de usuário", async function ()
  {
    const u = await semearUsuario("leitora");
    await salvarAvatar(u.id, "image/png", new Uint8Array([1]));

    expect(await buscarUsuarioPorId(u.id)).not.toHaveProperty("avatar");
    expect(await buscarUsuarioPorUsername("leitora")).not.toHaveProperty("avatar");
    expect(await buscarUsuarioPorUsername("leitora")).not.toHaveProperty("avatarMime");
  });
});
