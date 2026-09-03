import { describe, expect, it, vi } from "vitest";
import { gerarHashDeSenha } from "@/server/domain/senha";
import {
  entrar,
  type DependenciasDaSessao,
} from "@/server/services/sessao.service";

// As regras da issue #8 no nível do serviço: senha errada e usuário inexistente
// são indistinguíveis (mesma resposta, mesmo trabalho), e o que sai é um token
// opaco — quem põe em cookie é o controller.

async function fakeDeps(hash: string)
{
  const assinarToken = vi.fn(async function (userId: string)
  {
    return `token-de-${userId}`;
  });

  const deps: DependenciasDaSessao = {
    buscarCredenciais: async function (email)
    {
      return email === "existe@exemplo.test" ? { id: "u1", passwordHash: hash } : null;
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
      { email: "existe@exemplo.test", senha: "senha-certa-123" },
      deps,
    );

    expect(sessao).toEqual({ token: "token-de-u1" });
    expect(assinarToken).toHaveBeenCalledExactlyOnceWith("u1");
  });

  it("senha errada devolve null, sem assinar nada", async function ()
  {
    const hash = await gerarHashDeSenha("senha-certa-123");
    const { deps, assinarToken } = await fakeDeps(hash);

    const sessao = await entrar(
      { email: "existe@exemplo.test", senha: "senha-errada" },
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
      { email: "ninguem@exemplo.test", senha: "senha-certa-123" },
      deps,
    );
    const senhaErrada = await entrar(
      { email: "existe@exemplo.test", senha: "senha-errada" },
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
      { email: "ninguem@exemplo.test", senha: "qualquer" },
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
    const buscar = vi.fn(deps.buscarCredenciais);

    await entrar(
      { email: "Existe@Exemplo.TEST", senha: "senha-certa-123" },
      { ...deps, buscarCredenciais: buscar },
    );

    expect(buscar).toHaveBeenCalledExactlyOnceWith("existe@exemplo.test");
  });
});
