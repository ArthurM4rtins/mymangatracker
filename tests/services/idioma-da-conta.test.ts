import { describe, expect, it, vi } from "vitest";

import { gerarHashDeSenha } from "@/server/domain/senha";
import { entrar, type DependenciasDaSessao } from "@/server/services/sessao.service";
import { salvarIdioma, type DependenciasDoIdioma } from "@/server/services/idioma.service";

/**
 * Fase 5 da #116: o idioma vira preferência da conta, não do navegador.
 *
 * Duas regras nascem aqui. Entrar passa a devolver o idioma salvo junto com o
 * token — é o que permite ao controller escrever o cookie e a pessoa cair no
 * idioma dela já no primeiro clique de um aparelho novo. E quem nunca escolheu
 * idioma devolve `null`, para o controller NÃO escrever cookie nenhum e deixar
 * a negociação por `Accept-Language` valer.
 */

async function depsDeLogin(hash: string, idiomaSalvo: string | null)
{
  const deps: DependenciasDaSessao = {
    buscarCredenciais: async function (email)
    {
      return email === "existe@exemplo.test"
        ? { id: "u1", passwordHash: hash, locale: idiomaSalvo }
        : null;
    },
    assinarToken: async function (userId)
    {
      return `token-de-${userId}`;
    },
  };

  return deps;
}

describe("entrar devolve o idioma da conta", function ()
{
  it("devolve o idioma salvo junto com o token", async function ()
  {
    const hash = await gerarHashDeSenha("senha-certa-123");
    const deps = await depsDeLogin(hash, "pt-BR");

    const sessao = await entrar(
      { email: "existe@exemplo.test", senha: "senha-certa-123" },
      deps,
    );

    expect(sessao).toEqual({ token: "token-de-u1", locale: "pt-BR" });
  });

  it("devolve null quando a conta nunca escolheu idioma", async function ()
  {
    const hash = await gerarHashDeSenha("senha-certa-123");
    const deps = await depsDeLogin(hash, null);

    const sessao = await entrar(
      { email: "existe@exemplo.test", senha: "senha-certa-123" },
      deps,
    );

    expect(sessao).toEqual({ token: "token-de-u1", locale: null });
  });

  it("credencial errada continua indistinguível, sem vazar idioma", async function ()
  {
    const hash = await gerarHashDeSenha("senha-certa-123");
    const deps = await depsDeLogin(hash, "pt-BR");

    const naoExiste = await entrar({ email: "nao@existe.test", senha: "x" }, deps);
    const senhaErrada = await entrar(
      { email: "existe@exemplo.test", senha: "senha-errada" },
      deps,
    );

    expect(naoExiste).toBeNull();
    expect(senhaErrada).toBeNull();
  });
});

describe("salvarIdioma", function ()
{
  it("grava o idioma escolhido para a conta", async function ()
  {
    const gravar = vi.fn(async function () {});
    const deps: DependenciasDoIdioma = { gravar };

    const resultado = await salvarIdioma({ userId: "u1", locale: "en" }, deps);

    expect(resultado).toEqual({ estado: "ok" });
    expect(gravar).toHaveBeenCalledExactlyOnceWith("u1", "en");
  });

  /**
   * Quem valida o idioma é o controller, que é a camada que conhece o
   * `routing.locales`. O serviço não pode confiar nisso e ainda assim gravar
   * qualquer string: uma coluna com `xx-YY` faz o layout devolver 404 no login
   * seguinte da pessoa, e ela fica trancada fora da própria conta.
   */
  it("recusa idioma que não é um código de idioma", async function ()
  {
    const gravar = vi.fn(async function () {});
    const deps: DependenciasDoIdioma = { gravar };

    for (const invalido of ["", "  ", "portugues do brasil", "en/../x", "a".repeat(40)])
    {
      const resultado = await salvarIdioma({ userId: "u1", locale: invalido }, deps);

      expect(resultado).toEqual({ estado: "idioma_invalido" });
    }

    expect(gravar).not.toHaveBeenCalled();
  });
});
