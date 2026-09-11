import { describe, expect, it } from "vitest";
import { ipDoPedido } from "@/app/api/v1/_shared/ip";

// Achado 11 (#141): o limitador chaveia pelo IP, e o IP vinha do PRIMEIRO
// x-forwarded-for — que quem ataca escreve. Cada header forjado era um balde
// novo e vazio. O IP que vale e o que a borda confiavel anexou, lido da direita.

function pedido(cabecalhos: Record<string, string>): Request
{
  return new Request("https://folunio.test/api/v1/sessao", { method: "POST", headers: cabecalhos });
}

describe("ipDoPedido", function ()
{
  it("o header da plataforma ganha de tudo: e a Vercel quem o escreve", function ()
  {
    expect(ipDoPedido(pedido({
      "x-vercel-forwarded-for": "203.0.113.9",
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
    }), { hops: 1 })).toBe("203.0.113.9");
  });

  it("x-forwarded-for e lido da DIREITA: o valor forjado a esquerda nao conta", function ()
  {
    // O cliente manda "1.2.3.4"; o proxy confiavel anexa o IP real no fim.
    expect(ipDoPedido(pedido({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }), { hops: 1 }))
      .toBe("203.0.113.9");
  });

  it("com dois proxies confiaveis, vale o segundo da direita", function ()
  {
    // cliente -> borda -> balanceador: o ultimo e o IP da borda, nao o do cliente.
    expect(ipDoPedido(pedido({ "x-forwarded-for": "1.2.3.4, 203.0.113.9, 10.0.0.1" }), { hops: 2 }))
      .toBe("203.0.113.9");
  });

  it("um so valor, sem proxy nenhum, e o proprio", function ()
  {
    expect(ipDoPedido(pedido({ "x-forwarded-for": "203.0.113.9" }), { hops: 1 })).toBe("203.0.113.9");
  });

  it("IPv6 passa", function ()
  {
    expect(ipDoPedido(pedido({ "x-forwarded-for": "2001:db8::1" }), { hops: 1 })).toBe("2001:db8::1");
  });

  it("o que nao e IP vira desconhecido, nunca chave arbitraria", function ()
  {
    // Cada string distinta seria um balde novo e vazio: e o ataque.
    expect(ipDoPedido(pedido({ "x-forwarded-for": "nao-e-ip" }), { hops: 1 })).toBe("desconhecido");
    expect(ipDoPedido(pedido({ "x-forwarded-for": "1.2.3.4, tambem-nao" }), { hops: 1 })).toBe("desconhecido");
    expect(ipDoPedido(pedido({ "x-vercel-forwarded-for": "<script>" }), { hops: 1 })).toBe("desconhecido");
  });

  it("sem header nenhum e desconhecido (dev local)", function ()
  {
    expect(ipDoPedido(pedido({}), { hops: 1 })).toBe("desconhecido");
  });

  it("x-real-ip nao e mais considerado: e forjavel como o resto", function ()
  {
    expect(ipDoPedido(pedido({ "x-real-ip": "1.2.3.4" }), { hops: 1 })).toBe("desconhecido");
  });

  it("hops maior que a lista nao estoura: cai em desconhecido", function ()
  {
    expect(ipDoPedido(pedido({ "x-forwarded-for": "203.0.113.9" }), { hops: 3 })).toBe("desconhecido");
  });
});
