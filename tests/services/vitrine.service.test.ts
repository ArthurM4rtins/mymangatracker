import { describe, expect, it, vi } from "vitest";
import { vitrineDaHome } from "@/server/services/vitrine.service";

// Issue #76: a home pede resenhas e listas recentes de uma vez, com o mesmo
// limite; uma fonte falhando vira lista vazia e a outra sai.

function fakeDeps()
{
  return {
    resenhasRecentes: vi.fn(async function () { return [{ entryId: "r1", username: "ana" }]; }),
    listasRecentes: vi.fn(async function () { return [{ listaId: "l1", username: "ana" }]; }),
  };
}

describe("vitrineDaHome", function ()
{
  it("pede as duas listas com o limite", async function ()
  {
    const deps = fakeDeps();

    await expect(vitrineDaHome(deps)).resolves.toEqual({
      resenhas: [{ entryId: "r1", username: "ana" }],
      listas: [{ listaId: "l1", username: "ana" }],
    });
    // Pede mais do que exibe (#144): o rodízio de autoria precisa ter de onde
    // repor o que descarta.
    expect(deps.resenhasRecentes).toHaveBeenCalledWith(40);
    expect(deps.listasRecentes).toHaveBeenCalledWith(40);
  });

  it("uma fonte falhando vira lista vazia, a outra sai", async function ()
  {
    const deps = fakeDeps();
    deps.resenhasRecentes.mockRejectedValueOnce(new Error("fora"));

    await expect(vitrineDaHome(deps)).resolves.toEqual({
      resenhas: [],
      listas: [{ listaId: "l1", username: "ana" }],
    });
  });

  // #144: sem isto, 12 resenhas seguidas de uma conta só tomavam o trilho
  // inteiro, e repostar mantinha assim.
  it("nenhuma conta ocupa o trilho: no máximo duas por autor", async function ()
  {
    const deps = fakeDeps();
    deps.resenhasRecentes.mockResolvedValueOnce(
      Array.from({ length: 30 }, function (_, indice)
      {
        return { entryId: `r${indice}`, username: indice < 25 ? "spam" : "bia" };
      }),
    );

    const { resenhas } = await vitrineDaHome(deps);

    expect(resenhas.filter(function (r) { return r.username === "spam"; })).toHaveLength(2);
    expect(resenhas).toHaveLength(4);
  });
});
