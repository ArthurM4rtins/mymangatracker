import { describe, expect, it } from "vitest";
import {
  capituloValido,
  progressoAtual,
  progrideEstante,
} from "@/server/domain/progresso";

// As regras da issue #23: progresso é o MAIOR capítulo aberto — releitura
// registra histórico mas não regride a estante. Próximo capítulo é o inteiro
// seguinte ao maior (57.5 lido → próximo é 58). Capítulo decimal existe.

describe("progrideEstante", function ()
{
  it("primeiro capítulo sempre progride", function ()
  {
    expect(progrideEstante(null, 1)).toBe(true);
  });

  it("capítulo maior progride", function ()
  {
    expect(progrideEstante(57, 57.5)).toBe(true);
  });

  it("releitura de capítulo antigo não regride", function ()
  {
    expect(progrideEstante(57, 30)).toBe(false);
  });

  it("abrir o mesmo capítulo não muda nada", function ()
  {
    expect(progrideEstante(57, 57)).toBe(false);
  });
});

// #65, itens 1/24: a coluna é Decimal(8,2). Capítulo com três casas era
// arredondado em silêncio no banco enquanto URL e resposta usavam o número
// original; abaixo de 0,005 virava 0.00 e estourava o CHECK como 500.
describe("capituloValido", function ()
{
  it("aceita inteiro, meio e centésimo", function ()
  {
    expect(capituloValido(1)).toBe(true);
    expect(capituloValido(57.5)).toBe(true);
    expect(capituloValido(0.01)).toBe(true);
    expect(capituloValido(999999.99)).toBe(true);
  });

  it("recusa zero, negativo e não finito", function ()
  {
    expect(capituloValido(0)).toBe(false);
    expect(capituloValido(-1)).toBe(false);
    expect(capituloValido(Number.NaN)).toBe(false);
    expect(capituloValido(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("recusa mais de duas casas decimais", function ()
  {
    expect(capituloValido(57.555)).toBe(false);
    expect(capituloValido(0.004)).toBe(false);
    expect(capituloValido(1.001)).toBe(false);
  });
});

// Issue #61: desde a edição manual (#31), o capítulo marcado à mão na estante
// e o maior aberto no histórico podem divergir. O progresso atual é o MAIOR
// dos dois — nenhum deles regride o outro.
describe("progressoAtual", function ()
{
  it("sem edição manual nem histórico não há progresso", function ()
  {
    expect(progressoAtual(null, null)).toBeNull();
  });

  it("capítulo marcado à mão sozinho vale como progresso", function ()
  {
    expect(progressoAtual(100, null)).toBe(100);
  });

  it("histórico de abertura sozinho vale como progresso", function ()
  {
    expect(progressoAtual(null, 57.5)).toBe(57.5);
  });

  it("quando divergem, vale o maior — em qualquer ordem", function ()
  {
    expect(progressoAtual(100, 50)).toBe(100);
    expect(progressoAtual(50, 100)).toBe(100);
  });
});
