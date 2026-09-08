import { describe, expect, it, vi } from "vitest";
import { gerarHashDeSenha } from "@/server/domain/senha";
import {
  entrar,
  type DependenciasDaSessao,
} from "@/server/services/sessao.service";

// As regras da issue #8 no nível do serviço: senha errada e usuário inexistente
// são indistinguíveis (mesma resposta, mesmo trabalho), e o que sai é um token
// opaco — quem põe em cookie é o controller. A #166 acrescenta o username: a
// mesma conta entra pelos dois, e as duas portas seguem a MESMA regra.

async function fakeDeps(hash: string)
{
  const assinarToken = vi.fn(async function (userId: string)
  {
    return `token-de-${userId}`;
  });

  const deps: DependenciasDaSessao = {
    buscarPorEmail: async function (email)
    {
      return email === "existe@exemplo.test"
        ? { id: "u1", passwordHash: hash, locale: null }
        : null;
    },
    buscarPorUsername: async function (username)
    {
      return username === "roca"
        ? { id: "u1", passwordHash: hash, locale: null }
        : null;
    },
    assinarToken,
  };

  return { deps, assinarToken };
}

describe("entrar", function ()
{
  it("credenciais corretas devolvem o token assinado para o userId", async function ()
  {
    const hash = await gerarHashDeSenha("senha-certa-123");
    const { deps, assinarToken } = await fakeDeps(hash);

    const sessao = await entrar(
      { identificador: "existe@exemplo.test", senha: "senha-certa-123" },
      deps,
    );

    expect(sessao).toEqual({ token: "token-de-u1", locale: null });
    expect(assinarToken).toHaveBeenCalledExactlyOnceWith("u1");
  });

  it("senha errada devolve null, sem assinar nada", async function ()
  {
    const hash = await gerarHashDeSenha("senha-certa-123");
    const { deps, assinarToken } = await fakeDeps(hash);

    const sessao = await entrar(
      { identificador: "existe@exemplo.test", senha: "senha-errada" },
      deps,
    );

    expect(sessao).toBeNull();
    expect(assinarToken).not.toHaveBeenCalled();
  });

  it("usuário inexistente devolve o MESMO resultado que senha errada", async function ()
  {
    const hash = await gerarHashDeSenha("senha-certa-123");
    const { deps } = await fakeDeps(hash);

    const inexistente = await entrar(
      { identificador: "ninguem@exemplo.test", senha: "senha-certa-123" },
      deps,
    );
    const senhaErrada = await entrar(
      { identificador: "existe@exemplo.test", senha: "senha-errada" },
      deps,
    );

    expect(inexistente).toEqual(senhaErrada);
  });

  it("usuário inexistente ainda paga o custo do scrypt (sem atalho de tempo)", async function ()
  {
    const hash = await gerarHashDeSenha("senha-certa-123");
    const { deps } = await fakeDeps(hash);
    const verificar = vi.fn(async function () { return false; });

    await entrar(
      { identificador: "ninguem@exemplo.test", senha: "qualquer" },
      { ...deps, verificarHash: verificar },
    );

    // A verificação roda mesmo sem usuário — contra um hash fantasma — para o
    // tempo de resposta não denunciar quais e-mails existem.
    expect(verificar).toHaveBeenCalledOnce();
  });

  it("e-mail é normalizado para minúsculas na busca, como no cadastro", async function ()
  {
    const hash = await gerarHashDeSenha("senha-certa-123");
    const { deps } = await fakeDeps(hash);
    const buscar = vi.fn(deps.buscarPorEmail);

    await entrar(
      { identificador: "Existe@Exemplo.TEST", senha: "senha-certa-123" },
      { ...deps, buscarPorEmail: buscar },
    );

    expect(buscar).toHaveBeenCalledExactlyOnceWith("existe@exemplo.test");
  });

  it("a mesma conta entra pelo nome de usuário", async function ()
  {
    const hash = await gerarHashDeSenha("senha-certa-123");
    const { deps, assinarToken } = await fakeDeps(hash);

    const sessao = await entrar({ identificador: "roca", senha: "senha-certa-123" }, deps);

    expect(sessao).toEqual({ token: "token-de-u1", locale: null });
    expect(assinarToken).toHaveBeenCalledExactlyOnceWith("u1");
  });

  it("username normaliza como no cadastro: maiúscula e espaço não impedem entrar", async function ()
  {
    const hash = await gerarHashDeSenha("senha-certa-123");
    const { deps } = await fakeDeps(hash);
    const buscar = vi.fn(deps.buscarPorUsername);

    await entrar(
      { identificador: "  Roca  ", senha: "senha-certa-123" },
      { ...deps, buscarPorUsername: buscar },
    );

    expect(buscar).toHaveBeenCalledExactlyOnceWith("roca");
  });

  it("sem arroba não consulta e-mail, e com arroba não consulta username", async function ()
  {
    const hash = await gerarHashDeSenha("senha-certa-123");
    const { deps } = await fakeDeps(hash);
    const porEmail = vi.fn(deps.buscarPorEmail);
    const porUsername = vi.fn(deps.buscarPorUsername);

    await entrar(
      { identificador: "roca", senha: "senha-certa-123" },
      { ...deps, buscarPorEmail: porEmail, buscarPorUsername: porUsername },
    );

    expect(porEmail).not.toHaveBeenCalled();
    expect(porUsername).toHaveBeenCalledOnce();
  });

  it("username inexistente paga o mesmo scrypt que e-mail inexistente", async function ()
  {
    // A mesma regra da #8 vale para a porta nova: sem atalho de tempo, o
    // tempo de resposta não denuncia quais nomes de usuário existem.
    const hash = await gerarHashDeSenha("senha-certa-123");
    const { deps } = await fakeDeps(hash);
    const verificar = vi.fn(async function () { return false; });

    await entrar(
      { identificador: "ninguem", senha: "qualquer" },
      { ...deps, verificarHash: verificar },
    );

    expect(verificar).toHaveBeenCalledOnce();
  });

  it("identificador vazio devolve null sem consultar o banco", async function ()
  {
    const hash = await gerarHashDeSenha("senha-certa-123");
    const { deps, assinarToken } = await fakeDeps(hash);
    const porEmail = vi.fn(deps.buscarPorEmail);

    const sessao = await entrar(
      { identificador: "   ", senha: "senha-certa-123" },
      { ...deps, buscarPorEmail: porEmail },
    );

    expect(sessao).toBeNull();
    expect(porEmail).not.toHaveBeenCalled();
    expect(assinarToken).not.toHaveBeenCalled();
  });
});
