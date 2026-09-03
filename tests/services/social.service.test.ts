import { describe, expect, it, vi } from "vitest";
import { curtirPerfil, seguirUsuario } from "@/server/services/social.service";

// Issue #74: seguir e curtir perfil chegam por username (id nunca sai no
// recorte público). Inexistente = nao_encontrado sem tocar no toggle; a si
// mesmo = a_si_mesmo, decidido no domínio antes do banco; senão toggle e
// estado final.

const ALVO = { id: "u2", username: "leitora", createdAt: new Date("2026-08-01T00:00:00Z") };

function fakeDeps(cenario: { alvo?: typeof ALVO | null } = {})
{
  return {
    buscarPorUsername: vi.fn(async function ()
    {
      return cenario.alvo === undefined ? ALVO : cenario.alvo;
    }),
    alternar: vi.fn(async function () { return { ativo: true, total: 4 }; }),
  };
}

describe("seguirUsuario", function ()
{
  it("toggle por username e devolve o estado final", async function ()
  {
    const deps = fakeDeps();

    await expect(seguirUsuario({ userId: "u1", username: "leitora" }, deps)).resolves.toEqual({
      estado: "ok",
      ativo: true,
      total: 4,
    });
    expect(deps.alternar).toHaveBeenCalledWith("u1", "u2");
  });

  it("username inexistente é nao_encontrado, sem tocar no toggle", async function ()
  {
    const deps = fakeDeps({ alvo: null });

    await expect(seguirUsuario({ userId: "u1", username: "nada" }, deps)).resolves.toEqual({
      estado: "nao_encontrado",
    });
    expect(deps.alternar).not.toHaveBeenCalled();
  });

  it("seguir a si mesmo é a_si_mesmo, antes do banco", async function ()
  {
    const deps = fakeDeps();

    await expect(seguirUsuario({ userId: "u2", username: "leitora" }, deps)).resolves.toEqual({
      estado: "a_si_mesmo",
    });
    expect(deps.alternar).not.toHaveBeenCalled();
  });

  it("toggle null (alvo sumiu no meio) é nao_encontrado", async function ()
  {
    const deps = fakeDeps();
    deps.alternar.mockResolvedValueOnce(null as never);

    await expect(seguirUsuario({ userId: "u1", username: "leitora" }, deps)).resolves.toEqual({
      estado: "nao_encontrado",
    });
  });
});

describe("curtirPerfil", function ()
{
  it("mesmas regras do seguir", async function ()
  {
    const deps = fakeDeps();

    await expect(curtirPerfil({ userId: "u1", username: "leitora" }, deps)).resolves.toEqual({
      estado: "ok",
      ativo: true,
      total: 4,
    });
    expect(deps.alternar).toHaveBeenCalledWith("u1", "u2");
    await expect(curtirPerfil({ userId: "u2", username: "leitora" }, deps)).resolves.toEqual({
      estado: "a_si_mesmo",
    });
  });
});
