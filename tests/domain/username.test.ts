import { describe, expect, it } from "vitest";
import { normalizarUsername } from "@/server/domain/username";

// #114: username era único com colação sensível a maiúsculas — "Leitor" e
// "leitor" viravam duas contas e dois perfis. A identidade é a forma
// normalizada; a caixa digitada fica só para exibição.
describe("normalizarUsername", function ()
{
  it("baixa a caixa e apara espaços", function ()
  {
    expect(normalizarUsername("  Leitor_Nocturno  ")).toBe("leitor_nocturno");
  });

  it("preserva ponto, hífen e underline", function ()
  {
    expect(normalizarUsername("A.b-C_d")).toBe("a.b-c_d");
  });
});
