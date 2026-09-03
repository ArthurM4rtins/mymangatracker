import { describe, expect, it, vi } from "vitest";
import { vitrineDaHome } from "@/server/services/vitrine.service";

// Issue #76: a home pede resenhas e listas recentes de uma vez, com o mesmo
// limite; uma fonte falhando vira lista vazia e a outra sai.

function fakeDeps()
{
  return {
    resenhasRecentes: vi.fn(async function () { return [{ entryId: "r1" }]; }),
    listasRecentes: vi.fn(async function () { return [{ listaId: "l1" }]; }),
  };
}

describe("vitrineDaHome", function ()
{
  it("pede as duas listas com o limite", async function ()
  {
    const deps = fakeDeps();

    await expect(vitrineDaHome(deps)).resolves.toEqual({
      resenhas: [{ entryId: "r1" }],
      listas: [{ listaId: "l1" }],
    });
    expect(deps.resenhasRecentes).toHaveBeenCalledWith(12);
    expect(deps.listasRecentes).toHaveBeenCalledWith(12);
  });

  it("uma fonte falhando vira lista vazia, a outra sai", async function ()
  {
    const deps = fakeDeps();
    deps.resenhasRecentes.mockRejectedValueOnce(new Error("fora"));

    await expect(vitrineDaHome(deps)).resolves.toEqual({
      resenhas: [],
      listas: [{ listaId: "l1" }],
    });
  });
});
