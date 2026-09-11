import { beforeEach, describe, expect, it } from "vitest";

import {
  buscarCredenciaisPorEmail,
  criarUsuario,
  salvarIdioma,
} from "@/server/repositories/usuario.repository";

import { limparBanco } from "./apoio";

/**
 * Fase 5 da #116: o idioma vira preferência da conta.
 *
 * A ida e a volta são o que importa aqui — gravar não serve de nada se o login
 * não lê de volta, e é o login que escreve o cookie que faz a preferência valer
 * num aparelho novo.
 */

const NOVO = {
  username: "rankine",
  usernameNormalizado: "rankine",
  email: "rankine@exemplo.test",
  passwordHash: "scrypt$16384$8$1$saltsalt$hashhash",
};

beforeEach(limparBanco);

describe("idioma da conta", function ()
{
  it("nasce nulo — conta nova nunca escolheu idioma", async function ()
  {
    await criarUsuario(NOVO);

    const credenciais = await buscarCredenciaisPorEmail(NOVO.email);

    expect(credenciais?.locale).toBeNull();
  });

  it("grava e o login lê de volta", async function ()
  {
    const criado = await criarUsuario(NOVO);

    await salvarIdioma(criado.id, "en");

    const credenciais = await buscarCredenciaisPorEmail(NOVO.email);

    expect(credenciais?.locale).toBe("en");
  });

  it("trocar de novo sobrescreve, não acumula", async function ()
  {
    const criado = await criarUsuario(NOVO);

    await salvarIdioma(criado.id, "en");
    await salvarIdioma(criado.id, "pt-BR");

    const credenciais = await buscarCredenciaisPorEmail(NOVO.email);

    expect(credenciais?.locale).toBe("pt-BR");
  });
});
