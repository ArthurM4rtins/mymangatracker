import { describe, expect, it, vi } from "vitest";
import {
  avatarDoUsuario,
  definirAvatar,
  removerAvatar,
} from "@/server/services/avatar.service";

// Issue #76: o dono da sessão define ou remove a própria foto; qualquer um
// lê por username. Tipo e tamanho são decididos no domínio antes de tocar no
// banco; inexistente é null.

function fakeDeps()
{
  return {
    salvar: vi.fn(async function () { return { avatarUpdatedAt: new Date("2026-09-03T10:00:00Z") }; }),
    apagar: vi.fn(async function () { return undefined; }),
    buscarPorUsername: vi.fn(async function ()
    {
      return { bytes: Buffer.from([1, 2, 3]), mime: "image/jpeg", avatarUpdatedAt: new Date("2026-09-03T10:00:00Z") };
    }),
  };
}

describe("definirAvatar", function ()
{
  it("salva jpeg dentro do limite e devolve a versão", async function ()
  {
    const deps = fakeDeps();
    const bytes = Buffer.alloc(1000, 1);

    await expect(definirAvatar({ userId: "u1", mime: "image/jpeg", bytes }, deps)).resolves.toEqual({
      estado: "ok",
      versao: new Date("2026-09-03T10:00:00Z").getTime(),
    });
    expect(deps.salvar).toHaveBeenCalledWith("u1", "image/jpeg", bytes);
  });

  it("tipo ou tamanho inválido não chega ao banco", async function ()
  {
    const deps = fakeDeps();

    await expect(
      definirAvatar({ userId: "u1", mime: "image/gif", bytes: Buffer.alloc(10) }, deps),
    ).resolves.toEqual({ estado: "invalido", motivo: "tipo_invalido" });
    await expect(
      definirAvatar({ userId: "u1", mime: "image/png", bytes: Buffer.alloc(0) }, deps),
    ).resolves.toEqual({ estado: "invalido", motivo: "tamanho_invalido" });
    expect(deps.salvar).not.toHaveBeenCalled();
  });
});

describe("removerAvatar", function ()
{
  it("apaga a foto do dono", async function ()
  {
    const deps = fakeDeps();

    await expect(removerAvatar({ userId: "u1" }, deps)).resolves.toEqual({ estado: "ok" });
    expect(deps.apagar).toHaveBeenCalledWith("u1");
  });
});

describe("avatarDoUsuario", function ()
{
  it("devolve bytes, mime e versão por username", async function ()
  {
    const deps = fakeDeps();

    await expect(avatarDoUsuario("leitora", deps)).resolves.toEqual({
      bytes: Buffer.from([1, 2, 3]),
      mime: "image/jpeg",
      versao: new Date("2026-09-03T10:00:00Z").getTime(),
    });
    expect(deps.buscarPorUsername).toHaveBeenCalledWith("leitora");
  });

  it("sem foto ou sem usuário é null", async function ()
  {
    const deps = fakeDeps();
    deps.buscarPorUsername.mockResolvedValueOnce(null as never);

    await expect(avatarDoUsuario("ninguem", deps)).resolves.toBeNull();
  });
});
