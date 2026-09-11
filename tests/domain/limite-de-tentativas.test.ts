import { describe, expect, it } from "vitest";
import {
  avaliarLimite,
  chaveDeTentativa,
} from "@/server/domain/limite-de-tentativas";

// #108: login e cadastro sao rotas publicas de escrita sem contagem de
// tentativas, e cada login paga um scrypt caro. A regra e pura: dado quantas
// tentativas houve na janela e quando foi a mais antiga, bloqueia ou nao, e
// diz quanto esperar. Desde a #132 a contagem JA INCLUI a tentativa atual (o
// servico grava antes de contar), entao a de numero `maximo` passa e a
// `maximo + 1` bloqueia.

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

  it("exatamente no maximo, passa: e a propria tentativa de numero `maximo`", function ()
  {
    expect(avaliarLimite(5, new Date("2026-09-05T11:50:00.000Z"), AGORA, REGRA)).toEqual({
      bloqueado: false,
    });
  });

  it("uma acima do maximo, bloqueia e diz quanto falta para a mais antiga sair da janela", function ()
  {
    // Mais antiga as 11:50; janela de 15 min termina as 12:05; agora 12:00 -> 300 s.
    expect(avaliarLimite(6, new Date("2026-09-05T11:50:00.000Z"), AGORA, REGRA)).toEqual({
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

// #148, item 5: a chave era SHA-256 sem sal de entradas de baixissima entropia —
// um IPv4 tem 2^32 possibilidades, e o docblock prometia que a tabela nao vira
// lista de e-mails e IPs em claro. Com pepper, quem tiver o dump ainda precisa do
// segredo, que nao mora no banco.
describe("chaveDeTentativa com pepper", function ()
{
  it("o mesmo par com peppers diferentes da chaves diferentes", function ()
  {
    const a = chaveDeTentativa(["1.2.3.4"], "pepper-um");
    const b = chaveDeTentativa(["1.2.3.4"], "pepper-dois");

    expect(a).not.toEqual(b);
  });

  it("o mesmo par com o mesmo pepper e estavel", function ()
  {
    expect(chaveDeTentativa(["1.2.3.4"], "p")).toEqual(chaveDeTentativa(["1.2.3.4"], "p"));
  });

  it("continua normalizando: espaco nas pontas e maiuscula nao criam balde novo", function ()
  {
    expect(chaveDeTentativa([" A@X.COM "], "p")).toEqual(chaveDeTentativa(["a@x.com"], "p"));
  });

  it("sem pepper ainda produz chave estavel — dev sem a variavel nao quebra", function ()
  {
    expect(chaveDeTentativa(["1.2.3.4"])).toEqual(chaveDeTentativa(["1.2.3.4"]));
    expect(chaveDeTentativa(["1.2.3.4"])).not.toEqual(chaveDeTentativa(["1.2.3.4"], "p"));
  });
});
