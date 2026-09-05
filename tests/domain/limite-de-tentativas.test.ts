import { describe, expect, it } from "vitest";
import {
  avaliarLimite,
  chaveDeTentativa,
} from "@/server/domain/limite-de-tentativas";

// #108: login e cadastro sao rotas publicas de escrita sem contagem de
// tentativas, e cada login paga um scrypt caro. A regra e pura: dado quantas
// tentativas houve na janela e quando foi a mais antiga, bloqueia ou nao, e
// diz quanto esperar.

const AGORA = new Date("2026-09-05T12:00:00.000Z");
const REGRA = { maximo: 5, janelaMs: 15 * 60_000 };

describe("avaliarLimite", function ()
{
  it("abaixo do maximo, passa", function ()
  {
    expect(avaliarLimite(4, new Date("2026-09-05T11:50:00.000Z"), AGORA, REGRA)).toEqual({
      bloqueado: false,
    });
  });

  it("sem tentativa nenhuma, passa", function ()
  {
    expect(avaliarLimite(0, null, AGORA, REGRA)).toEqual({ bloqueado: false });
  });

  it("no maximo, bloqueia e diz quanto falta para a mais antiga sair da janela", function ()
  {
    // Mais antiga as 11:50; janela de 15 min termina as 12:05; agora 12:00 -> 300 s.
    expect(avaliarLimite(5, new Date("2026-09-05T11:50:00.000Z"), AGORA, REGRA)).toEqual({
      bloqueado: true,
      esperarSegundos: 300,
    });
  });

  it("espera minima e 1 segundo, mesmo com a janela quase vencida", function ()
  {
    expect(avaliarLimite(7, new Date("2026-09-05T11:45:00.500Z"), AGORA, REGRA)).toEqual({
      bloqueado: true,
      esperarSegundos: 1,
    });
  });
});

describe("chaveDeTentativa", function ()
{
  it("e deterministica e nao carrega o texto original", function ()
  {
    const a = chaveDeTentativa(["203.0.113.9", "Leitor@Teste.local"]);
    const b = chaveDeTentativa(["203.0.113.9", "leitor@teste.local"]);

    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("teste.local");
  });

  it("muda quando qualquer parte muda", function ()
  {
    expect(chaveDeTentativa(["203.0.113.9", "a@x"])).not.toBe(chaveDeTentativa(["203.0.113.10", "a@x"]));
    expect(chaveDeTentativa(["203.0.113.9", "a@x"])).not.toBe(chaveDeTentativa(["203.0.113.9", "b@x"]));
  });
});
