import { describe, expect, it } from "vitest";
import { interpretarDescricao } from "@/server/domain/descricao";

// Issue #45: a descrição do AniList vem com sufixo "(Source: X)" e um bloco
// "Notes:" em texto corrido. A tela quer sinopse limpa e notas em tópicos.

const BERSERK = `His name is Guts, the Black Swordsman.

(Source: Dark Horse)

Notes:
- Volumes 1-5 contain the 16 prequel chapters 0A - 0P.
- Chapter 83 was omitted from Volume 13 due to the author's request.
- Volume 14 includes "Berserk: The Prototype".`;

describe("interpretarDescricao", function ()
{
  it("separa sinopse limpa e notas em tópicos", function ()
  {
    expect(interpretarDescricao(BERSERK)).toEqual({
      sinopse: "His name is Guts, the Black Swordsman.",
      notas: [
        "Volumes 1-5 contain the 16 prequel chapters 0A - 0P.",
        "Chapter 83 was omitted from Volume 13 due to the author's request.",
        'Volume 14 includes "Berserk: The Prototype".',
      ],
    });
  });

  it("sem Source nem Notes, a sinopse passa intacta", function ()
  {
    expect(interpretarDescricao("Só a sinopse.")).toEqual({
      sinopse: "Só a sinopse.",
      notas: [],
    });
  });

  it("remove o Source mesmo sem Notes", function ()
  {
    expect(interpretarDescricao("Sinopse.\n\n(Source: MANGA Plus)")).toEqual({
      sinopse: "Sinopse.",
      notas: [],
    });
  });

  it("nota de linha única após Notes: sem hífen também entra", function ()
  {
    expect(
      interpretarDescricao("Sinopse.\n\nNote:\nThe series went on hiatus in 2021."),
    ).toEqual({
      sinopse: "Sinopse.",
      notas: ["The series went on hiatus in 2021."],
    });
  });
});
