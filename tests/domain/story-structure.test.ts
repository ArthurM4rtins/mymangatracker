import { describe, expect, it } from "vitest";
import { validarEstruturaNarrativa } from "@/server/domain/story-structure";

type Intervalo = { unit: string; start: string; end: string };

// `range` e `ranges` opcionais no tipo: o teste de intervalos descontínuos
// troca um pelo outro, e o literal inferido não permitiria.
type Segmento = {
  key: string;
  parentKey?: string;
  kind: string;
  position: number;
  title: string;
  range?: Intervalo;
  ranges?: Intervalo[];
  sourceIds: string[];
  status: string;
};

const ESTRUTURA_VALIDA: {
  schemaVersion: number;
  media: { anilistId: number; title: string };
  curation: { status: string };
  sources: { id: string; url: string }[];
  segments: Segmento[];
} = {
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
    invalida.segments[0].range!.end = "0.5";

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
  // Issue #16, lote 2: Fire Force tem capítulo 00 (prólogo) e o AniList o
  // conta nas 305 entradas — zero é início válido.
  it("aceita capítulo 0 como início (Fire Force)", () => {
    const valida = structuredClone(ESTRUTURA_VALIDA);
    valida.segments[1].range!.start = "0";

    expect(validarEstruturaNarrativa(valida)).toEqual([]);
  });

  // Berserk: o prólogo Black Swordsman aparece como "-16" em site editorial
  // (listfist) e como "0.01"–"0.09" no MangaDex. O tracker só registra
  // capítulo positivo (Decimal(8,2), zod positive), então a base é o decimal —
  // negativo nunca casaria com progresso de leitura.
  it("recusa capítulo negativo (Berserk numerado -16 por site editorial)", () => {
    const invalida = structuredClone(ESTRUTURA_VALIDA);
    invalida.segments[1].range = { unit: "CHAPTER", start: "-16", end: "-9" };

    expect(validarEstruturaNarrativa(invalida)).toContain("segments[1]: intervalo inválido");
  });

  it("aceita prólogo decimal antes do capítulo 1 (Berserk 0.01–0.09 no MangaDex)", () => {
    const valida = structuredClone(ESTRUTURA_VALIDA);
    valida.segments[1].range = { unit: "CHAPTER", start: "0.01", end: "0.09" };

    expect(validarEstruturaNarrativa(valida)).toEqual([]);
  });

  // Lote 2 chegou com 7 arquivos em formato próprio ({name, range sem unit}):
  // segmento sem identidade não é importável.
  it("recusa segmento sem key, kind, title ou status", () => {
    const invalida = structuredClone(ESTRUTURA_VALIDA);
    const solto = { name: "Easton Enrollment", range: { start: "1", end: "15" }, sourceIds: ["fonte-1"] };
    (invalida.segments as unknown[]).push(solto);

    const erros = validarEstruturaNarrativa(invalida);

    expect(erros).toContain("segments[2]: intervalo inválido");
    expect(erros).toContain("segments[2]: segmento sem key, kind, title ou status");
  });

  it("recusa kind fora de SAGA/ARC", () => {
    const invalida = structuredClone(ESTRUTURA_VALIDA);
    invalida.segments[1].kind = "PARTE";

    expect(validarEstruturaNarrativa(invalida)).toContain("segments[1]: segmento sem key, kind, title ou status");
  });

  it("aceita arco com intervalos descontínuos", () => {
    const valida = structuredClone(ESTRUTURA_VALIDA);
    delete valida.segments[1].range;
    valida.segments[1].ranges = [
      { unit: "CHAPTER", start: "1", end: "2" },
      { unit: "CHAPTER", start: "4", end: "5" },
    ];

    expect(validarEstruturaNarrativa(valida)).toEqual([]);
  });
});
