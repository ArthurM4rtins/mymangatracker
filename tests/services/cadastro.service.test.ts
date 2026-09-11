import { describe, expect, it } from "vitest";
import { ErroCampoDuplicado } from "@/server/domain/erros";
import { verificarSenha } from "@/server/domain/senha";
import {
  cadastrarUsuario,
  type DependenciasDoCadastro,
} from "@/server/services/cadastro.service";

// A regra da issue #7 no nível do serviço: a senha em texto não chega ao
// repositório — o que desce é um hash scrypt verificável.

function fakeRepositorio()
{
  const gravados: Array<{ username: string; usernameNormalizado: string; email: string; passwordHash: string }> = [];

  const deps: DependenciasDoCadastro = {
    criarUsuario: async function (dados)
    {
      gravados.push(dados);
      return { id: "u1", username: dados.username, email: dados.email };
    },
  };

  return { deps, gravados };
}

const ENTRADA = {
  username: "rankine",
  email: "rankine@exemplo.test",
  senha: "senha-forte-123",
};

describe("cadastrarUsuario", function ()
{
  it("grava hash scrypt verificável, nunca a senha em texto", async function ()
  {
    const { deps, gravados } = fakeRepositorio();

    await cadastrarUsuario(ENTRADA, deps);

    expect(gravados).toHaveLength(1);
    expect(gravados[0].passwordHash).not.toContain("senha-forte-123");
    expect(gravados[0].passwordHash.startsWith("scrypt$")).toBe(true);
    await expect(
      verificarSenha("senha-forte-123", gravados[0].passwordHash),
    ).resolves.toBe(true);
  });

  it("devolve o DTO público, sem hash", async function ()
  {
    const { deps } = fakeRepositorio();

    const criado = await cadastrarUsuario(ENTRADA, deps);

    expect(criado).toEqual({
      id: "u1",
      username: "rankine",
      email: "rankine@exemplo.test",
    });
    expect(criado).not.toHaveProperty("passwordHash");
  });

  it("deixa ErroCampoDuplicado subir intacto para o controller traduzir", async function ()
  {
    const deps: DependenciasDoCadastro = {
      criarUsuario: async function ()
      {
        throw new ErroCampoDuplicado("email");
      },
    };

    await expect(cadastrarUsuario(ENTRADA, deps)).rejects.toMatchObject({
      name: "ErroCampoDuplicado",
      campo: "email",
    });
  });

  it("grava o username normalizado junto do digitado (#114)", async function ()
  {
    const { deps, gravados } = fakeRepositorio();

    await cadastrarUsuario({ ...ENTRADA, username: "Rankine.Dev" }, deps);

    expect(gravados[0]).toMatchObject({
      username: "Rankine.Dev",
      usernameNormalizado: "rankine.dev",
    });
  });

  it("normaliza email para minúsculas antes de gravar", async function ()
  {
    const { deps, gravados } = fakeRepositorio();

    await cadastrarUsuario({ ...ENTRADA, email: "Rankine@Exemplo.TEST" }, deps);

    expect(gravados[0].email).toBe("rankine@exemplo.test");
  });
});
