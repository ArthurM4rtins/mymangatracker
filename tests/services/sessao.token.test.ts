import { SignJWT, decodeJwt } from "jose";
import { describe, expect, it } from "vitest";
import {
  assinarSessao,
  segredoDaSessao,
  verificarSessao,
} from "@/server/infra/sessao";

// As regras da issue #8 no nível do token: o JWT carrega o userId e NADA mais,
// e token inválido/expirado é ausência de sessão, nunca erro. A #137 acrescenta
// `ver`: a versão que o banco compara para revogar ao sair.

const OPCOES = { segredo: "segredo-de-teste-com-32-bytes-ok!", versao: 0 };

describe("assinarSessao / verificarSessao", function ()
{
  it("o que assina, verifica — e devolve o userId", async function ()
  {
    const token = await assinarSessao("u1", OPCOES);

    await expect(verificarSessao(token, OPCOES)).resolves.toEqual({ userId: "u1", versao: 0 });
  });

  it("a versão vai e volta inteira: é o que o banco compara ao revogar (#137)", async function ()
  {
    const token = await assinarSessao("u1", { ...OPCOES, versao: 3 });

    await expect(verificarSessao(token, OPCOES)).resolves.toEqual({ userId: "u1", versao: 3 });
  });

  it("token de antes da #137, sem ver, conta como versão 0 — ninguém cai no deploy", async function ()
  {
    const agora = Math.floor(Date.now() / 1000);
    const antigo = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setIssuedAt(agora)
      .setExpirationTime(agora + 3600)
      .sign(new TextEncoder().encode(OPCOES.segredo));

    await expect(verificarSessao(antigo, OPCOES)).resolves.toEqual({ userId: "u1", versao: 0 });
  });

  it("o payload carrega só sub, iat, exp e ver — nada de e-mail, papel ou nome", async function ()
  {
    const token = await assinarSessao("u1", OPCOES);
    const payload = decodeJwt(token);

    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "sub", "ver"]);
    expect(payload.sub).toBe("u1");
  });

  it("token adulterado é null, não erro", async function ()
  {
    const token = await assinarSessao("u1", OPCOES);
    const adulterado = token.slice(0, -4) + "aaaa";

    await expect(verificarSessao(adulterado, OPCOES)).resolves.toBeNull();
    await expect(verificarSessao("nem-e-jwt", OPCOES)).resolves.toBeNull();
    await expect(verificarSessao("", OPCOES)).resolves.toBeNull();
  });

  it("token assinado com outro segredo é null", async function ()
  {
    const token = await assinarSessao("u1", { segredo: "outro-segredo-diferente-32-bytes", versao: 0 });

    await expect(verificarSessao(token, OPCOES)).resolves.toBeNull();
  });

  it("token expirado é null — relógio injetado, sem esperar de verdade", async function ()
  {
    const duasHorasAtras = Math.floor(Date.now() / 1000) - 7200;
    const token = await assinarSessao("u1", {
      ...OPCOES,
      agoraEmSegundos: function () { return duasHorasAtras; },
      duracaoSegundos: 3600,
    });

    await expect(verificarSessao(token, OPCOES)).resolves.toBeNull();
  });
});

describe("segredoDaSessao", function ()
{
  it("sem SESSION_SECRET recusa iniciar com erro claro — nunca segredo padrão", function ()
  {
    const original = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;

    try
    {
      expect(function () { segredoDaSessao(); }).toThrowError(/SESSION_SECRET/);
    }
    finally
    {
      if (original !== undefined)
      {
        process.env.SESSION_SECRET = original;
      }
    }
  });
});
