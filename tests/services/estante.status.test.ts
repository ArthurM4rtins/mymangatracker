import { describe, expect, it, vi } from "vitest";
import {
  listarEstante,
  mudarStatusDaEntrada,
  type EntradaDaEstante,
} from "@/server/services/estante.service";

// As regras da issue #11: toda consulta carrega userId — a estante de um
// usuário nunca aparece para outro; entrada que não é do usuário não é
// encontrada (não "proibida": não revelamos que existe).

const ENTRADA: EntradaDaEstante = {
  entradaId: "e1",
  status: "READING",
  progressChapter: null,
  obra: {
    titleRomaji: "Vinland Saga",
    titleEnglish: null,
    coverImageUrl: null,
    type: "MANGA",
    countryOfOrigin: "JP",
    chapters: 224,
  },
};

describe("listarEstante", function ()
{
  it("delega ao repositório com o userId e o filtro de status", async function ()
  {
    const listarEntradas = vi.fn(async function () { return [ENTRADA]; });

    const entradas = await listarEstante(
      { userId: "u1", status: "READING" },
      { listarEntradas },
    );

    expect(listarEntradas).toHaveBeenCalledWith("u1", "READING");
    expect(entradas).toEqual([ENTRADA]);
  });

  it("sem filtro, pede a estante inteira do usuário", async function ()
  {
    const listarEntradas = vi.fn(async function () { return []; });

    await listarEstante({ userId: "u1" }, { listarEntradas });

    expect(listarEntradas).toHaveBeenCalledWith("u1", undefined);
  });
});

describe("mudarStatusDaEntrada", function ()
{
  it("devolve ok quando a entrada é do usuário", async function ()
  {
    const atualizarStatus = vi.fn(async function () { return { id: "e1" }; });

    const resultado = await mudarStatusDaEntrada(
      { userId: "u1", entradaId: "e1", status: "COMPLETED" },
      { atualizarStatus },
    );

    expect(atualizarStatus).toHaveBeenCalledWith("u1", "e1", "COMPLETED");
    expect(resultado).toEqual({ estado: "ok" });
  });

  it("devolve nao_encontrada quando a entrada não existe ou é de outro usuário", async function ()
  {
    const atualizarStatus = vi.fn(async function () { return null; });

    const resultado = await mudarStatusDaEntrada(
      { userId: "u1", entradaId: "e-do-outro", status: "COMPLETED" },
      { atualizarStatus },
    );

    expect(resultado).toEqual({ estado: "nao_encontrada" });
  });
});
