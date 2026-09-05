import { describe, expect, it, vi } from "vitest";
import {
  apagarComentarioDaReview,
  comentarReview,
  comentariosAnterioresDaReview,
  curtirReview,
} from "@/server/services/review-social.service";

async function livre()
{
  return { bloqueado: false as const };
}

// As regras da issue #39: curtir é toggle em resenha existente; comentário
// tem texto de 1 a 2000 depois do trim; apagar só o próprio.

describe("curtirReview", function ()
{
  it("alterna e devolve o estado final", async function ()
  {
    const alternar = vi.fn(async function () { return { curtida: true, total: 3 }; });

    const resultado = await curtirReview({ userId: "u1", entryId: "e1" }, { alternar });

    expect(alternar).toHaveBeenCalledWith("e1", "u1");
    expect(resultado).toEqual({ estado: "ok", curtida: true, total: 3 });
  });

  it("resenha inexistente é nao_encontrada", async function ()
  {
    const alternar = vi.fn(async function () { return null; });

    await expect(
      curtirReview({ userId: "u1", entryId: "morta" }, { alternar }),
    ).resolves.toEqual({ estado: "nao_encontrada" });
  });
});

describe("comentarReview", function ()
{
  it("comenta com o texto aparado", async function ()
  {
    const comentar = vi.fn(async function () { return { id: "c1" }; });

    const resultado = await comentarReview(
      { userId: "u1", entryId: "e1", texto: "  concordo!  " },
      { comentar, limitar: livre },
    );

    expect(comentar).toHaveBeenCalledWith("e1", "u1", "concordo!");
    expect(resultado).toEqual({ estado: "ok" });
  });

  it("texto vazio ou gigante é inválido, sem tocar o banco", async function ()
  {
    const comentar = vi.fn();

    await expect(
      comentarReview({ userId: "u1", entryId: "e1", texto: "   " }, { comentar, limitar: livre }),
    ).resolves.toEqual({ estado: "comentario_invalido" });
    await expect(
      comentarReview(
        { userId: "u1", entryId: "e1", texto: "x".repeat(2001) },
        { comentar, limitar: livre },
      ),
    ).resolves.toEqual({ estado: "comentario_invalido" });
    expect(comentar).not.toHaveBeenCalled();
  });

  it("resenha inexistente é nao_encontrada", async function ()
  {
    const comentar = vi.fn(async function () { return null; });

    await expect(
      comentarReview({ userId: "u1", entryId: "morta", texto: "oi" }, { comentar, limitar: livre }),
    ).resolves.toEqual({ estado: "nao_encontrada" });
  });
});

describe("comentarReview — teto por usuário (#109)", function ()
{
  it("usuário que estourou o teto é muitos_comentarios, sem gravar", async function ()
  {
    const comentar = vi.fn(async function () { return { id: "c1" }; });
    const limitar = vi.fn(async function () { return { bloqueado: true as const, esperarSegundos: 120 }; });

    const resultado = await comentarReview(
      { userId: "u1", entryId: "e1", texto: "spam" },
      { comentar, limitar },
    );

    expect(resultado).toEqual({ estado: "muitos_comentarios", esperarSegundos: 120 });
    expect(limitar).toHaveBeenCalledWith("u1");
    expect(comentar).not.toHaveBeenCalled();
  });

  it("texto inválido nem consulta o limite", async function ()
  {
    const comentar = vi.fn(async function () { return { id: "c1" }; });
    const limitar = vi.fn(async function () { return { bloqueado: false as const }; });

    await comentarReview({ userId: "u1", entryId: "e1", texto: "   " }, { comentar, limitar });

    expect(limitar).not.toHaveBeenCalled();
  });
});

describe("comentariosAnterioresDaReview", function ()
{
  it("pede ao repositório os anteriores à data, com o userId para marcar os meus", async function ()
  {
    const listar = vi.fn(async function () { return []; });
    const antesDe = new Date("2026-09-05T12:00:00.000Z");

    const resultado = await comentariosAnterioresDaReview(
      { entryId: "e1", antesDe, userId: "u1" },
      { listar },
    );

    expect(listar).toHaveBeenCalledWith("e1", antesDe, "u1");
    expect(resultado).toEqual([]);
  });
});

describe("apagarComentarioDaReview", function ()
{
  it("apaga o próprio; alheio ou inexistente é nao_encontrada", async function ()
  {
    const apagar = vi.fn(async function (): Promise<{ removido: true } | null>
    {
      return { removido: true };
    });

    await expect(
      apagarComentarioDaReview({ userId: "u1", comentarioId: "c1" }, { apagar }),
    ).resolves.toEqual({ estado: "ok" });
    expect(apagar).toHaveBeenCalledWith("u1", "c1");

    apagar.mockResolvedValue(null);
    await expect(
      apagarComentarioDaReview({ userId: "u1", comentarioId: "alheio" }, { apagar }),
    ).resolves.toEqual({ estado: "nao_encontrada" });
  });
});
