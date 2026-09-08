import { describe, expect, it } from "vitest";
import { interpretarIdentificador } from "@/server/domain/identificador-de-login";

// Entrar aceita e-mail OU nome de usuário no mesmo campo (#166). Quem decide
// qual dos dois é esta função — não a tela, que só tem um input, nem o
// repositório, que já recebe a chave pronta.

describe("interpretarIdentificador", function ()
{
  it("com arroba é e-mail, em minúsculas", function ()
  {
    expect(interpretarIdentificador("  Leitor@Exemplo.TEST  ")).toEqual({
      tipo: "email",
      valor: "leitor@exemplo.test",
    });
  });

  it("sem arroba é username, normalizado como no cadastro", function ()
  {
    // Mesma normalização de `usernameNormalizado` (#114): "Leitor" e "leitor"
    // são a mesma pessoa, e é essa forma que é única no banco.
    expect(interpretarIdentificador("  Roca  ")).toEqual({
      tipo: "username",
      valor: "roca",
    });
  });

  it("vazio não é identificador nenhum", function ()
  {
    expect(interpretarIdentificador("   ")).toBeNull();
  });

  it("arroba solta ainda é tratada como e-mail, e o login falha depois", function ()
  {
    // Não é papel daqui validar formato de e-mail: quem não existe no banco
    // recebe o mesmo `null` de senha errada. Decidir "isto parece e-mail" e
    // recusar aqui abriria uma resposta diferente para entrada malformada.
    expect(interpretarIdentificador("@")).toEqual({ tipo: "email", valor: "@" });
  });

  it("username com arroba no meio conta como e-mail", function ()
  {
    // Username não pode ter arroba, então não há ambiguidade real.
    expect(interpretarIdentificador("a@b")).toEqual({ tipo: "email", valor: "a@b" });
  });
});
