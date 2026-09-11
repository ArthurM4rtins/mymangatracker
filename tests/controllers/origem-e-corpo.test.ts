import { describe, expect, it } from "vitest";
import { lerJson } from "@/app/api/v1/_shared/corpo";
import { mesmaOrigem } from "@/app/api/v1/_shared/origem";

// Achado 1 da auditoria (#131): um form auto-submetido em outro site faz o
// navegador da vitima dar POST no login e gravar o cookie do atacante. As duas
// guardas sao de controller e puras sobre a Request: da para provar sem servidor.

const NOSSA = "https://folunio.test/api/v1/sessao";

function pedido(cabecalhos: Record<string, string>, corpo?: string): Request
{
  return new Request(NOSSA, {
    method: "POST",
    headers: cabecalhos,
    body: corpo,
  });
}

describe("mesmaOrigem", function ()
{
  it("o site falando consigo passa", function ()
  {
    expect(mesmaOrigem(pedido({ "sec-fetch-site": "same-origin" }))).toBe(true);
  });

  it("navegacao iniciada pela pessoa (barra, favorito) passa", function ()
  {
    expect(mesmaOrigem(pedido({ "sec-fetch-site": "none" }))).toBe(true);
  });

  it("pagina de outro site NAO passa — e o form auto-submetido do ataque", function ()
  {
    expect(mesmaOrigem(pedido({ "sec-fetch-site": "cross-site", origin: "https://evil.tld" }))).toBe(false);
    expect(mesmaOrigem(pedido({ "sec-fetch-site": "same-site" }))).toBe(false);
  });

  it("sem sec-fetch-site, decide pelo origin: igual passa, diferente nao", function ()
  {
    expect(mesmaOrigem(pedido({ origin: "https://folunio.test" }))).toBe(true);
    expect(mesmaOrigem(pedido({ origin: "https://evil.tld" }))).toBe(false);
  });

  it("sem cabecalho nenhum (curl, cliente que nao e navegador) passa", function ()
  {
    // Nao e CSRF: CSRF precisa do navegador da vitima, e o navegador manda os
    // cabecalhos. Bloquear aqui so quebraria a extensao e o curl.
    expect(mesmaOrigem(pedido({}))).toBe(true);
  });

  it("sec-fetch-site ganha do origin quando os dois vem", function ()
  {
    // O navegador escreve os dois; o sec-fetch-site e o que nenhuma pagina forja.
    expect(mesmaOrigem(pedido({ "sec-fetch-site": "cross-site", origin: "https://folunio.test" }))).toBe(false);
  });
});

describe("lerJson", function ()
{
  it("application/json com corpo valido entra", async function ()
  {
    const lido = await lerJson(pedido({ "content-type": "application/json" }, "{\"a\":1}"));

    expect(lido).toEqual({ ok: true, corpo: { a: 1 } });
  });

  it("aceita charset e maiusculas no content-type", async function ()
  {
    const lido = await lerJson(pedido({ "content-type": "Application/JSON; charset=utf-8" }, "{}"));

    expect(lido.ok).toBe(true);
  });

  it("text/plain e recusado com 415 — e o enctype do form do ataque", async function ()
  {
    const lido = await lerJson(pedido({ "content-type": "text/plain" }, "{\"email\":\"x\"}"));

    expect(lido.ok).toBe(false);
    if (!lido.ok)
    {
      expect(lido.resposta.status).toBe(415);
    }
  });

  it("sem content-type e recusado com 415", async function ()
  {
    const lido = await lerJson(pedido({}, "{}"));

    expect(lido.ok).toBe(false);
    if (!lido.ok)
    {
      expect(lido.resposta.status).toBe(415);
    }
  });

  it("JSON quebrado com o tipo certo continua 400, como antes", async function ()
  {
    const lido = await lerJson(pedido({ "content-type": "application/json" }, "{nao e json"));

    expect(lido.ok).toBe(false);
    if (!lido.ok)
    {
      expect(lido.resposta.status).toBe(400);
    }
  });
});
