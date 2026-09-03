import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validarEstruturaNarrativa } from "@/server/domain/story-structure";

// Issue #16: o validador roda nos 100 JSON reais, não só em fixture. O lote 2
// chegou com 7 arquivos em formato próprio e ninguém viu — o teste unitário
// só cobria o contrato, nunca a base curada.
const DIRETORIO = "data/story-structures/titles";
const PROGRESSO = "data/story-structures/progress.json";

type Titulo = {
  media: { anilistId: number; title: string };
  curation: { status: string; researchedAt: string | null };
  segments: unknown[];
};

const titulos = readdirSync(DIRETORIO)
  .filter((nome) => nome.endsWith(".json"))
  .map(function (nome)
  {
    const titulo = JSON.parse(readFileSync(`${DIRETORIO}/${nome}`, "utf8")) as Titulo;

    return { nome, titulo };
  });

describe("base curada em data/story-structures/titles", () =>
{
  it("existe e tem o tamanho da fila", () =>
  {
    expect(titulos.length).toBeGreaterThan(0);
  });

  it.each(titulos.map(({ nome, titulo }) => [nome, titulo.media.title, titulo]))(
    "%s (%s) passa no validador do domínio",
    (_nome, _obra, titulo) =>
    {
      expect(validarEstruturaNarrativa(titulo)).toEqual([]);
    },
  );

  it("nome do arquivo é o anilistId da obra", () =>
  {
    const fora = titulos.filter(({ nome, titulo }) => nome !== `${titulo.media.anilistId}.json`);

    expect(fora.map(({ nome }) => nome)).toEqual([]);
  });

  it("DRAFT e VERIFIED têm segmentos; os demais status não", () =>
  {
    const comArcos = ["DRAFT", "VERIFIED"];
    const errados = titulos.filter(({ titulo }) =>
      comArcos.includes(titulo.curation.status) === (titulo.segments.length === 0),
    );

    expect(errados.map(({ nome, titulo }) => `${nome} ${titulo.curation.status}`)).toEqual([]);
  });

  it("progress.json bate com a contagem dos arquivos", () =>
  {
    const progresso = JSON.parse(readFileSync(PROGRESSO, "utf8")) as {
      targetCount: number;
      counts: Record<string, number>;
    };
    const porStatus = (status: string) =>
      titulos.filter(({ titulo }) => titulo.curation.status === status).length;
    const pesquisados = titulos.filter(({ titulo }) => titulo.curation.researchedAt !== null).length;

    expect(progresso.counts).toEqual({
      pending: progresso.targetCount - pesquisados,
      verified: porStatus("VERIFIED"),
      draft: porStatus("DRAFT"),
      disputed: porStatus("DISPUTED"),
      insufficientEvidence: porStatus("INSUFFICIENT_EVIDENCE"),
      notApplicable: porStatus("NOT_APPLICABLE"),
    });
  });
});
