import { describe, expect, it } from "vitest";
import { confirmacaoConfere } from "@/server/domain/exclusao-de-conta";

// #208: apagar a conta e' irreversivel e leva tudo em cascata — estante,
// listas, avaliacoes, comentarios (inclusive os que OUTRAS pessoas escreveram
// nas resenhas de quem sai) e progresso. A confirmacao existe para a pessoa
// PARAR e ler, entao ela digita o proprio nome de usuario.

describe("confirmacaoConfere", function ()
{
  it("aceita o nome exato", function ()
  {
    expect(confirmacaoConfere("leitora", "leitora")).toBe(true);
  });

  it("aceita a mesma identidade em outra caixa, e com espaco nas pontas", function ()
  {
    // Mesma regra do #114: "Leitora" e "leitora" sao a mesma pessoa.
    expect(confirmacaoConfere("  LEITORA ", "leitora")).toBe(true);
  });

  it("recusa nome de outra pessoa", function ()
  {
    expect(confirmacaoConfere("outra", "leitora")).toBe(false);
  });

  it("recusa vazio, mesmo quando o username tambem esta vazio", function ()
  {
    // Sem isto, um bug que zerasse o username transformaria "confirmar" em
    // apertar enter sem digitar nada.
    expect(confirmacaoConfere("", "leitora")).toBe(false);
    expect(confirmacaoConfere("   ", "leitora")).toBe(false);
    expect(confirmacaoConfere("", "")).toBe(false);
  });

  it("recusa nome parecido", function ()
  {
    expect(confirmacaoConfere("leitor", "leitora")).toBe(false);
    expect(confirmacaoConfere("leitora ", "leitoras")).toBe(false);
  });
});
