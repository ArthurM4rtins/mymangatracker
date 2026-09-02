import { describe, expect, it } from "vitest";
import { contagemPorStatus, totalDaEstante } from "@/server/domain/perfil";

// A estante pública do perfil (issue #49) mostra só CONTAGENS por status, nunca
// as obras nem o capítulo. Status sem linha no banco aparece como zero.

describe("contagemPorStatus", function ()
{
  it("preenche os cinco status com zero quando não há linhas", function ()
  {
    expect(contagemPorStatus([])).toEqual({
      READING: 0,
      COMPLETED: 0,
      PLANNED: 0,
      PAUSED: 0,
      DROPPED: 0,
    });
  });

  it("copia o total de cada status presente e soma o total geral", function ()
  {
    const contagem = contagemPorStatus([
      { status: "READING", total: 3 },
      { status: "DROPPED", total: 1 },
    ]);

    expect(contagem).toEqual({
      READING: 3,
      COMPLETED: 0,
      PLANNED: 0,
      PAUSED: 0,
      DROPPED: 1,
    });
    expect(totalDaEstante(contagem)).toBe(4);
  });
});
