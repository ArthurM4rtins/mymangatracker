import { describe, expect, it } from "vitest";
import { gerarHashDeSenha, verificarSenha } from "@/server/domain/senha";

// As regras da issue #7: scrypt com salt próprio por hash, verificação em tempo
// constante, e a senha em texto nunca aparece no material gravado.

describe("gerarHashDeSenha", function ()
{
  it("gera hashes diferentes para a mesma senha (salt aleatório)", async function ()
  {
    const primeiro = await gerarHashDeSenha("correta-batataestavel");
    const segundo = await gerarHashDeSenha("correta-batataestavel");

    expect(primeiro).not.toBe(segundo);
  });

  it("não contém a senha em texto no hash", async function ()
  {
    const hash = await gerarHashDeSenha("senha-legivel-123");

    expect(hash).not.toContain("senha-legivel-123");
  });

  it("carrega algoritmo e parâmetros no próprio hash, para endurecer depois", async function ()
  {
    const hash = await gerarHashDeSenha("qualquer");

    // scrypt$N$r$p$salt$derivada — 6 segmentos separados por $
    const segmentos = hash.split("$");
    expect(segmentos).toHaveLength(6);
    expect(segmentos[0]).toBe("scrypt");
    expect(Number(segmentos[1])).toBeGreaterThan(0);
    expect(Number(segmentos[2])).toBeGreaterThan(0);
    expect(Number(segmentos[3])).toBeGreaterThan(0);
  });
});

describe("verificarSenha", function ()
{
  it("aceita a senha correta", async function ()
  {
    const hash = await gerarHashDeSenha("correta-batataestavel");

    await expect(verificarSenha("correta-batataestavel", hash)).resolves.toBe(true);
  });

  it("recusa senha errada", async function ()
  {
    const hash = await gerarHashDeSenha("correta-batataestavel");

    await expect(verificarSenha("errada", hash)).resolves.toBe(false);
  });

  it("recusa hash malformado sem levantar erro", async function ()
  {
    await expect(verificarSenha("qualquer", "lixo-sem-formato")).resolves.toBe(false);
    await expect(verificarSenha("qualquer", "")).resolves.toBe(false);
  });

  it("verifica hash com parâmetros diferentes dos atuais (hash antigo continua válido)", async function ()
  {
    // Simula um hash gerado com N menor — a verificação lê os parâmetros do hash,
    // não os constantes do módulo.
    const hash = await gerarHashDeSenha("migrada", { custoN: 4096 });

    await expect(verificarSenha("migrada", hash)).resolves.toBe(true);
    await expect(verificarSenha("outra", hash)).resolves.toBe(false);
  });
});
