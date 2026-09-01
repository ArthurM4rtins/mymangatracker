import { describe, expect, it } from "vitest";
import { validarEstruturaNarrativa } from "@/server/domain/story-structure";

const ESTRUTURA_VALIDA = {
  schemaVersion: 1,
  media: { anilistId: 1, title: "Obra" },
  curation: { status: "VERIFIED" },
  sources: [{ id: "fonte-1", url: "https://example.com" }],
  segments: [
    {
      key: "saga",
      kind: "SAGA",
      position: 1,
      title: "Saga",
      range: { unit: "CHAPTER", start: "1", end: "10" },
      sourceIds: ["fonte-1"],
      status: "VERIFIED",
    },
    {
      key: "arco",
      parentKey: "saga",
      kind: "ARC",
      position: 1,
      title: "Arco",
      range: { unit: "CHAPTER", start: "1", end: "5" },
      sourceIds: ["fonte-1"],
      status: "VERIFIED",
    },
  ],
};

describe("validarEstruturaNarrativa", () => {
  it("aceita saga e arco com fontes e intervalos válidos", () => {
    expect(validarEstruturaNarrativa(ESTRUTURA_VALIDA)).toEqual([]);
  });

  it("recusa fim anterior ao início", () => {
    const invalida = structuredClone(ESTRUTURA_VALIDA);
    invalida.segments[0].range.end = "0.5";

    expect(validarEstruturaNarrativa(invalida)).toContain("segments[0]: intervalo inválido");
  });

  it("recusa arco cujo pai não é uma saga", () => {
    const invalida = structuredClone(ESTRUTURA_VALIDA);
    invalida.segments[1].parentKey = "inexistente";

    expect(validarEstruturaNarrativa(invalida)).toContain("segments[1]: parentKey não aponta para saga");
  });

  it("exige fonte em segmento verificado", () => {
    const invalida = structuredClone(ESTRUTURA_VALIDA);
    invalida.segments[1].sourceIds = [];

    expect(validarEstruturaNarrativa(invalida)).toContain("segments[1]: segmento verificado sem fonte");
  });
  it("accepts discontinuous arc ranges", () => {
    const valida = structuredClone(ESTRUTURA_VALIDA);
    delete valida.segments[1].range;
    valida.segments[1].ranges = [
      { unit: "CHAPTER", start: "1", end: "2" },
      { unit: "CHAPTER", start: "4", end: "5" },
    ];

    expect(validarEstruturaNarrativa(valida)).toEqual([]);
  });
});
