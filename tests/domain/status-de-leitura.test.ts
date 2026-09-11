import { describe, expect, it } from "vitest";
import { statusAposLeitura } from "@/server/domain/status-de-leitura";

// Registrar um capítulo diz algo sobre o status: quem começou a obra que estava
// Planejada está lendo, e quem voltou à que tinha pausado ou largado também.
// Concluída é a exceção — reler um capítulo não desmarca a obra como concluída.
//
// A regra vale para os DOIS caminhos que registram leitura, o do site e o da
// extensão (issue #52), e por isso mora aqui e não dentro de um deles.

describe("statusAposLeitura", function ()
{
  it("obra planejada vira lendo: é o caso de começar pela extensão", function ()
  {
    expect(statusAposLeitura("PLANNED")).toBe("READING");
  });

  it("obra pausada volta a lendo", function ()
  {
    expect(statusAposLeitura("PAUSED")).toBe("READING");
  });

  it("obra largada volta a lendo", function ()
  {
    expect(statusAposLeitura("DROPPED")).toBe("READING");
  });

  it("quem já está lendo não muda de status", function ()
  {
    expect(statusAposLeitura("READING")).toBeNull();
  });

  it("reler capítulo não desmarca obra concluída", function ()
  {
    expect(statusAposLeitura("COMPLETED")).toBeNull();
  });
});
