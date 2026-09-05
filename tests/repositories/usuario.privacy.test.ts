import { beforeEach, describe, expect, it } from "vitest";
import { ErroCampoDuplicado } from "@/server/domain/erros";
import {
  buscarCredenciaisPorEmail,
  buscarUsuarioPorId,
  buscarUsuarioPorUsername,
  criarUsuario,
} from "@/server/repositories/usuario.repository";
import { limparBanco } from "./apoio";

// A regra da issue #7: o passwordHash não sai em NENHUMA consulta de leitura.
// O único caminho que devolve hash é buscarCredenciaisPorEmail, usado só pelo
// serviço de sessão — e devolve id e hash, nada além.

const NOVO = {
  username: "rankine",
  usernameNormalizado: "rankine",
  email: "rankine@exemplo.test",
  passwordHash: "scrypt$16384$8$1$saltsalt$hashhash",
};

beforeEach(limparBanco);

describe("criarUsuario", function ()
{
  it("devolve o usuário sem o passwordHash", async function ()
  {
    const criado = await criarUsuario(NOVO);

    expect(criado.id).toBeTruthy();
    expect(criado.username).toBe("rankine");
    expect(criado.email).toBe("rankine@exemplo.test");
    expect(criado).not.toHaveProperty("passwordHash");
  });

  it("traduz email duplicado para ErroCampoDuplicado(email)", async function ()
  {
    await criarUsuario(NOVO);

    await expect(
      criarUsuario({ ...NOVO, username: "outro" }),
    ).rejects.toThrowError(ErroCampoDuplicado);

    await expect(
      criarUsuario({ ...NOVO, username: "outro" }),
    ).rejects.toMatchObject({ campo: "email" });
  });

  it("traduz username duplicado para ErroCampoDuplicado(username)", async function ()
  {
    await criarUsuario(NOVO);

    await expect(
      criarUsuario({ ...NOVO, email: "outro@exemplo.test" }),
    ).rejects.toMatchObject({ campo: "username" });
  });
});

// #114: identidade do username é a forma normalizada.
describe("username sem distinção de caixa", function ()
{
  it("username em caixa diferente é duplicado", async function ()
  {
    await criarUsuario({ ...NOVO, username: "Leitor", usernameNormalizado: "leitor", email: "a@x.test" });

    await expect(
      criarUsuario({ ...NOVO, username: "LEITOR", usernameNormalizado: "leitor", email: "b@x.test" }),
    ).rejects.toMatchObject({ campo: "username" });
  });

  it("perfil e foto resolvem o username em qualquer caixa, exibindo o digitado", async function ()
  {
    await criarUsuario({ ...NOVO, username: "Leitor", usernameNormalizado: "leitor", email: "a@x.test" });

    const perfil = await buscarUsuarioPorUsername("leitor");
    expect(perfil?.username).toBe("Leitor");
    expect(await buscarUsuarioPorUsername("LEITOR")).not.toBeNull();
  });
});

describe("buscarUsuarioPorId", function ()
{
  it("devolve o usuário sem o passwordHash", async function ()
  {
    const criado = await criarUsuario(NOVO);
    const lido = await buscarUsuarioPorId(criado.id);

    expect(lido).not.toBeNull();
    expect(lido).not.toHaveProperty("passwordHash");
  });

  it("devolve null para id inexistente", async function ()
  {
    await expect(buscarUsuarioPorId("nao-existe")).resolves.toBeNull();
  });
});

describe("buscarCredenciaisPorEmail", function ()
{
  it("devolve só id e passwordHash — o mínimo que a autenticação precisa", async function ()
  {
    const criado = await criarUsuario(NOVO);
    const credenciais = await buscarCredenciaisPorEmail("rankine@exemplo.test");

    expect(credenciais).toEqual({
      id: criado.id,
      passwordHash: NOVO.passwordHash,
    });
  });

  it("devolve null para email desconhecido", async function ()
  {
    await expect(
      buscarCredenciaisPorEmail("ninguem@exemplo.test"),
    ).resolves.toBeNull();
  });
});
