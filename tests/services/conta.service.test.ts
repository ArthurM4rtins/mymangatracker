import { describe, expect, it, vi } from "vitest";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import { apagarConta } from "@/server/services/conta.service";

// #208: a exclusao e' irreversivel. O servico so manda apagar depois de a
// confirmacao bater com o username REAL de quem esta logado — nunca com o que o
// cliente mandou junto.

function fakeDeps(overrides = {})
{
  return {
    buscarUsuario: vi.fn(async function () { return { username: "leitora" }; }),
    limitar: vi.fn(async function (): Promise<Veredito> { return { bloqueado: false }; }),
    apagar: vi.fn(async function () {}),
    ...overrides,
  };
}

describe("apagarConta", function ()
{
  it("com a confirmacao certa, apaga", async function ()
  {
    const deps = fakeDeps();

    await expect(apagarConta({ userId: "u1", confirmacao: "leitora" }, deps))
      .resolves.toEqual({ estado: "ok" });
    expect(deps.apagar).toHaveBeenCalledWith("u1");
  });

  it("confirmacao errada NAO apaga", async function ()
  {
    const deps = fakeDeps();

    await expect(apagarConta({ userId: "u1", confirmacao: "outra" }, deps))
      .resolves.toEqual({ estado: "confirmacao_invalida" });
    expect(deps.apagar).not.toHaveBeenCalled();
  });

  it("confirmacao vazia NAO apaga", async function ()
  {
    const deps = fakeDeps();

    await expect(apagarConta({ userId: "u1", confirmacao: "  " }, deps))
      .resolves.toEqual({ estado: "confirmacao_invalida" });
    expect(deps.apagar).not.toHaveBeenCalled();
  });

  it("a confirmacao e' comparada com o username do BANCO, nao com o do pedido", async function ()
  {
    const deps = fakeDeps({
      buscarUsuario: vi.fn(async function () { return { username: "dona-de-verdade" }; }),
    });

    await expect(apagarConta({ userId: "u1", confirmacao: "leitora" }, deps))
      .resolves.toEqual({ estado: "confirmacao_invalida" });
    expect(deps.apagar).not.toHaveBeenCalled();
  });

  it("sessao de usuario que ja nao existe nao apaga nada", async function ()
  {
    const deps = fakeDeps({
      buscarUsuario: vi.fn(async function (): Promise<{ username: string } | null> { return null; }),
    });

    await expect(apagarConta({ userId: "u1", confirmacao: "leitora" }, deps))
      .resolves.toEqual({ estado: "nao_encontrada" });
    expect(deps.apagar).not.toHaveBeenCalled();
  });

  it("acima do teto nao apaga", async function ()
  {
    const deps = fakeDeps({
      limitar: vi.fn(async function (): Promise<Veredito>
      {
        return { bloqueado: true, esperarSegundos: 30 };
      }),
    });

    await expect(apagarConta({ userId: "u1", confirmacao: "leitora" }, deps))
      .resolves.toEqual({ estado: "muitos_pedidos", esperarSegundos: 30 });
    expect(deps.apagar).not.toHaveBeenCalled();
  });
});
