import { describe, expect, it, vi } from "vitest";
import { chaveDeTentativa } from "@/server/domain/limite-de-tentativas";
import { planoDoLogin, verificarERegistrar, zerar } from "@/server/services/limite.service";

// #108: o servico junta as chaves (ip+conta, so ip, so conta), consulta a
// contagem de cada uma e bloqueia se QUALQUER uma estourou (com a maior
// espera). Desde a #132 a tentativa e GRAVADA antes de contar: pedidos em
// paralelo se enxergam, e pedido bloqueado tambem grava.

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

  it("uma chave estourada bloqueia — e a tentativa fica gravada mesmo assim (#132)", async function ()
  {
    // Contagem ja com a propria linha: 6 > 5. Gravar o bloqueado estende o
    // bloqueio enquanto o ataque continua.
    const { deps, registrar } = fakeDeps({
      par: { total: 6, maisAntiga: new Date("2026-09-05T11:50:00.000Z") },
    });

    const resultado = await verificarERegistrar(
      { escopo: "login", chaves: [{ chave: "par", regra: REGRA_PAR }, { chave: "ip", regra: REGRA_IP }], agora: AGORA },
      deps,
    );

    expect(resultado).toEqual({ bloqueado: true, esperarSegundos: 300 });
    expect(registrar).toHaveBeenCalledTimes(2);
  });

  it("duas chaves estouradas: vale a maior espera", async function ()
  {
    const { deps } = fakeDeps({
      par: { total: 6, maisAntiga: new Date("2026-09-05T11:50:00.000Z") },
      ip: { total: 21, maisAntiga: new Date("2026-09-05T11:30:00.000Z") },
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

// #132: N pedidos em paralelo contra a mesma chave. O fake conta so o que ja
// foi registrado — como o banco. Com gravar-antes-de-contar, no maximo
// `maximo` passam; com contar-antes-de-gravar, todos passavam.
describe("verificarERegistrar sob rajada paralela (#132)", function ()
{
  it("de 10 pedidos simultaneos com maximo 5, no maximo 5 passam", async function ()
  {
    const registradas: string[] = [];
    const deps = {
      contar: async function (_escopo: string, chave: string)
      {
        const total = registradas.filter(function (c) { return c === chave; }).length;

        return { total, maisAntiga: total === 0 ? null : AGORA };
      },
      registrar: async function (_escopo: string, chave: string) { registradas.push(chave); },
      limpar: async function () {},
    };

    const vereditos = await Promise.all(
      Array.from({ length: 10 }, function ()
      {
        return verificarERegistrar(
          { escopo: "login", chaves: [{ chave: "par", regra: REGRA_PAR }], agora: AGORA },
          deps,
        );
      }),
    );

    const passaram = vereditos.filter(function (v) { return !v.bloqueado; }).length;

    expect(passaram).toBeLessThanOrEqual(5);
    expect(registradas).toHaveLength(10);
  });
});

// #133: o sucesso zera SO o par ip+conta. Zerar o IP deixava o atacante limpar
// as tentativas contra outras contas entrando na dele; e sem chave por conta,
// distribuido em IPs nao havia teto nenhum.
describe("planoDoLogin (#133)", function ()
{
  it("limita por par, por IP e por conta", function ()
  {
    const plano = planoDoLogin("203.0.113.9", "Leitor@Exemplo.TEST");

    expect(plano.limitar).toHaveLength(3);
    expect(plano.limitar.map(function (c) { return c.chave; })).toEqual([
      chaveDeTentativa(["203.0.113.9", "leitor@exemplo.test"]),
      chaveDeTentativa(["203.0.113.9"]),
      chaveDeTentativa(["leitor@exemplo.test"]),
    ]);
  });

  it("o sucesso zera so o par: nem o IP, nem a conta", function ()
  {
    const plano = planoDoLogin("203.0.113.9", "leitor@exemplo.test");

    expect(plano.liberar).toEqual([chaveDeTentativa(["203.0.113.9", "leitor@exemplo.test"])]);
  });

  it("a mesma conta de IPs diferentes cai no MESMO balde por conta", function ()
  {
    const a = planoDoLogin("203.0.113.9", "leitor@exemplo.test");
    const b = planoDoLogin("198.51.100.7", "leitor@exemplo.test");

    expect(a.limitar[2].chave).toBe(b.limitar[2].chave);
    expect(a.limitar[0].chave).not.toBe(b.limitar[0].chave);
  });

  it("contas diferentes no mesmo IP compartilham so o balde do IP", function ()
  {
    const a = planoDoLogin("203.0.113.9", "alice@exemplo.test");
    const b = planoDoLogin("203.0.113.9", "bob@exemplo.test");

    expect(a.limitar[1].chave).toBe(b.limitar[1].chave);
    expect(a.limitar[0].chave).not.toBe(b.limitar[0].chave);
    expect(a.limitar[2].chave).not.toBe(b.limitar[2].chave);
    // E o que o sucesso de alice zera nao toca o balde do IP que bob compartilha.
    expect(a.liberar).not.toContain(a.limitar[1].chave);
  });
});
