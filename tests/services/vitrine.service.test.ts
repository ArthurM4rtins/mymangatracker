import { describe, expect, it, vi } from "vitest";
import { JANELA_DA_VITRINE_DIAS, vitrineDaHome } from "@/server/services/vitrine.service";

// Issue #76: a home pede as quatro listas de uma vez — resenhas e listas
// recentes, resenhas e listas mais curtidas na janela (7 dias). Uma fonte
// falhando vira lista vazia; as outras saem. "Desde" é calculado aqui, a
// partir do agora injetado, para o repositório não saber de calendário.

const AGORA = new Date("2026-09-03T12:00:00Z");
const DESDE = new Date("2026-08-27T12:00:00Z");

function fakeDeps()
{
  return {
    resenhasRecentes: vi.fn(async function () { return [{ entryId: "r1" }]; }),
    resenhasMaisCurtidas: vi.fn(async function () { return [{ entryId: "r2" }]; }),
    listasRecentes: vi.fn(async function () { return [{ listaId: "l1" }]; }),
    listasMaisCurtidas: vi.fn(async function () { return [{ listaId: "l2" }]; }),
  };
}

describe("vitrineDaHome", function ()
{
  it("pede as quatro listas com o limite e a janela de 7 dias", async function ()
  {
    const deps = fakeDeps();

    const vitrine = await vitrineDaHome(AGORA, deps);

    expect(JANELA_DA_VITRINE_DIAS).toBe(7);
    expect(vitrine).toEqual({
      resenhas: { recentes: [{ entryId: "r1" }], maisCurtidas: [{ entryId: "r2" }] },
      listas: { recentes: [{ listaId: "l1" }], maisCurtidas: [{ listaId: "l2" }] },
    });
    expect(deps.resenhasRecentes).toHaveBeenCalledWith(12);
    expect(deps.resenhasMaisCurtidas).toHaveBeenCalledWith(DESDE, 12);
    expect(deps.listasRecentes).toHaveBeenCalledWith(12);
    expect(deps.listasMaisCurtidas).toHaveBeenCalledWith(DESDE, 12);
  });

  it("uma fonte falhando vira lista vazia, as outras saem", async function ()
  {
    const deps = fakeDeps();
    deps.resenhasMaisCurtidas.mockRejectedValueOnce(new Error("fora"));

    const vitrine = await vitrineDaHome(AGORA, deps);

    expect(vitrine.resenhas.maisCurtidas).toEqual([]);
    expect(vitrine.resenhas.recentes).toEqual([{ entryId: "r1" }]);
    expect(vitrine.listas.maisCurtidas).toEqual([{ listaId: "l2" }]);
  });
});
