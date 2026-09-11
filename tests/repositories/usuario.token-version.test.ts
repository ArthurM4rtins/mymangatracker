import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  buscarCredenciaisPorEmail,
  buscarVersaoDoToken,
  incrementarVersaoDoToken,
} from "@/server/repositories/usuario.repository";
import { getPrisma } from "@/server/repositories/prisma";
import { limparBanco, semearUsuario } from "./apoio";

// tokenVersion (#137): nasce em 0, sobe a cada "sair", e as credenciais do
// login a carregam para o token novo ja nascer valido.

describe("tokenVersion", () =>
{
  beforeEach(async () =>
  {
    await limparBanco();
  });

  afterAll(async () =>
  {
    await getPrisma().$disconnect();
  });

  it("nasce em 0 e sobe um por vez", async () =>
  {
    const leitor = await semearUsuario("leitor");

    expect(await buscarVersaoDoToken(leitor.id)).toBe(0);

    await incrementarVersaoDoToken(leitor.id);
    await incrementarVersaoDoToken(leitor.id);

    expect(await buscarVersaoDoToken(leitor.id)).toBe(2);
  });

  it("usuario inexistente e null, nao erro", async () =>
  {
    expect(await buscarVersaoDoToken("nao-existe")).toBeNull();
  });

  it("as credenciais do login carregam a versao atual", async () =>
  {
    const leitor = await semearUsuario("leitor");
    await incrementarVersaoDoToken(leitor.id);

    const credenciais = await buscarCredenciaisPorEmail(leitor.email);

    expect(credenciais?.tokenVersion).toBe(1);
  });

  it("incrementar so mexe no usuario certo", async () =>
  {
    const alice = await semearUsuario("alice");
    const bob = await semearUsuario("bob");

    await incrementarVersaoDoToken(alice.id);

    expect(await buscarVersaoDoToken(alice.id)).toBe(1);
    expect(await buscarVersaoDoToken(bob.id)).toBe(0);
  });
});
