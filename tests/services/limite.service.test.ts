import { describe, expect, it, vi } from "vitest";
import { verificarERegistrar, zerar } from "@/server/services/limite.service";

// #108: o servico junta as chaves (ex.: ip+email e so ip), consulta a
// contagem de cada uma, bloqueia se QUALQUER uma estourou (com a maior
// espera) e so registra a tentativa quando passa.

const AGORA = new Date("2026-09-05T12:00:00.000Z");

function fakeDeps(contagens: Record<string, { total: number; maisAntiga: Date | null }>)
{
  const contar = vi.fn(async function (_escopo: string, chave: string)
  {
    return contagens[chave] ?? { total: 0, maisAntiga: null };
  });
  const registrar = vi.fn(async function () {});
  const limpar = vi.fn(async function () {});

  return { deps: { contar, registrar, limpar }, contar, registrar, limpar };
}

const REGRA_PAR = { maximo: 5, janelaMs: 15 * 60_000 };
const REGRA_IP = { maximo: 20, janelaMs: 60 * 60_000 };

describe("verificarERegistrar", function ()
{
  it("abaixo do limite em todas as chaves: passa e registra cada uma", async function ()
  {
    const { deps, registrar } = fakeDeps({ par: { total: 2, maisAntiga: AGORA } });

    const resultado = await verificarERegistrar(
      { escopo: "login", chaves: [{ chave: "par", regra: REGRA_PAR }, { chave: "ip", regra: REGRA_IP }], agora: AGORA },
      deps,
    );

    expect(resultado).toEqual({ bloqueado: false });
    expect(registrar).toHaveBeenCalledTimes(2);
    expect(registrar).toHaveBeenCalledWith("login", "par");
    expect(registrar).toHaveBeenCalledWith("login", "ip");
  });

  it("uma chave estourada bloqueia sem registrar nada", async function ()
  {
    const { deps, registrar } = fakeDeps({
      par: { total: 5, maisAntiga: new Date("2026-09-05T11:50:00.000Z") },
    });

    const resultado = await verificarERegistrar(
      { escopo: "login", chaves: [{ chave: "par", regra: REGRA_PAR }, { chave: "ip", regra: REGRA_IP }], agora: AGORA },
      deps,
    );

    expect(resultado).toEqual({ bloqueado: true, esperarSegundos: 300 });
    expect(registrar).not.toHaveBeenCalled();
  });

  it("duas chaves estouradas: vale a maior espera", async function ()
  {
    const { deps } = fakeDeps({
      par: { total: 5, maisAntiga: new Date("2026-09-05T11:50:00.000Z") },
      ip: { total: 20, maisAntiga: new Date("2026-09-05T11:30:00.000Z") },
    });

    const resultado = await verificarERegistrar(
      { escopo: "login", chaves: [{ chave: "par", regra: REGRA_PAR }, { chave: "ip", regra: REGRA_IP }], agora: AGORA },
      deps,
    );

    // ip: 11:30 + 60 min = 12:30 -> 1800 s; par daria 300 s.
    expect(resultado).toEqual({ bloqueado: true, esperarSegundos: 1800 });
  });

  it("consulta cada chave desde o inicio da PROPRIA janela", async function ()
  {
    const { deps, contar } = fakeDeps({});

    await verificarERegistrar(
      { escopo: "login", chaves: [{ chave: "par", regra: REGRA_PAR }, { chave: "ip", regra: REGRA_IP }], agora: AGORA },
      deps,
    );

    expect(contar).toHaveBeenCalledWith("login", "par", new Date("2026-09-05T11:45:00.000Z"));
    expect(contar).toHaveBeenCalledWith("login", "ip", new Date("2026-09-05T11:00:00.000Z"));
  });
});

describe("zerar", function ()
{
  it("limpa todas as chaves do escopo", async function ()
  {
    const { deps, limpar } = fakeDeps({});

    await zerar({ escopo: "login", chaves: ["par", "ip"] }, deps);

    expect(limpar).toHaveBeenCalledWith("login", "par");
    expect(limpar).toHaveBeenCalledWith("login", "ip");
  });
});
