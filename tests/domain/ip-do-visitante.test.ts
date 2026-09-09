import { describe, expect, it } from "vitest";
import { escolherIp } from "@/server/domain/ip-do-visitante";

// Achado 11 da auditoria (#141): o valor vinha do PRIMEIRO x-forwarded-for, que
// é quem ataca que escreve — cada header forjado era um balde novo e vazio no
// limitador. A regra mora no domínio desde a #134, porque a rota e a página do
// catálogo precisam dela e uma não importa da outra.

function ler(mapa: Record<string, string>)
{
  return function (nome: string) { return mapa[nome] ?? null; };
}

describe("escolherIp", function ()
{
  it("o cabeçalho da plataforma ganha do encadeado", function ()
  {
    expect(
      escolherIp(
        ler({ "x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": "1.2.3.4" }),
        1,
      ),
    ).toBe("203.0.113.9");
  });

  it("lê o encadeado da direita, pulando os proxies confiáveis", function ()
  {
    expect(escolherIp(ler({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }), 1)).toBe("203.0.113.9");
    expect(
      escolherIp(ler({ "x-forwarded-for": "1.2.3.4, 203.0.113.9, 10.0.0.1" }), 2),
    ).toBe("203.0.113.9");
  });

  it("aceita IPv6", function ()
  {
    expect(escolherIp(ler({ "x-forwarded-for": "2001:db8::1" }), 1)).toBe("2001:db8::1");
  });

  it("o que não é IP válido vira desconhecido, nunca chave arbitrária", function ()
  {
    expect(escolherIp(ler({ "x-forwarded-for": "nao-e-ip" }), 1)).toBe("desconhecido");
    expect(escolherIp(ler({ "x-vercel-forwarded-for": "<script>" }), 1)).toBe("desconhecido");
  });

  it("sem cabeçalho nenhum, é desconhecido", function ()
  {
    expect(escolherIp(ler({}), 1)).toBe("desconhecido");
  });
});
