import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validarEstruturaNarrativa } from "@/server/domain/story-structure";

// Issue #16: o validador roda nos 100 JSON reais, não só em fixture. O lote 2
// chegou com 7 arquivos em formato próprio e ninguém viu — o teste unitário
// só cobria o contrato, nunca a base curada.
const DIRETORIO = "data/story-structures/titles";
const PROGRESSO = "data/story-structures/progress.json";

type Intervalo = { start: string; end: string | null };
type Segmento = { key: string; parentKey?: string; range?: Intervalo; ranges?: Intervalo[] };

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

  // Decisão de 03/09: irmãos (mesmo parentKey) cobrem o trecho sem sobrepor
  // nem deixar lacuna — lacuna real é INTERLUDE explícito. Fim aberto (null)
  // só no último irmão.
  it("irmãos não se sobrepõem nem deixam lacuna", () =>
  {
    const problemas: string[] = [];

    for (const { nome, titulo } of titulos)
    {
      const grupos = new Map<string, Array<[number, number | null, string]>>();

      for (const bruto of titulo.segments)
      {
        const s = bruto as Segmento;
        const intervalos = s.ranges ?? (s.range ? [s.range] : []);
        const grupo = grupos.get(s.parentKey ?? "") ?? [];

        for (const r of intervalos)
        {
          grupo.push([Number(r.start), r.end === null ? null : Number(r.end), s.key]);
        }

        grupos.set(s.parentKey ?? "", grupo);
      }

      for (const [pai, intervalos] of grupos)
      {
        intervalos.sort((a, b) => a[0] - b[0]);

        for (let i = 1; i < intervalos.length; i++)
        {
          const [, fimAnterior, chaveAnterior] = intervalos[i - 1];
          const [inicio, , chave] = intervalos[i];
          const onde = `${nome}${pai ? ` (${pai})` : ""}: ${chaveAnterior} → ${chave}`;

          if (fimAnterior === null)
          {
            problemas.push(`${onde}: fim aberto antes do último`);
          }
          else if (inicio <= fimAnterior)
          {
            problemas.push(`${onde}: sobreposição no capítulo ${inicio}`);
          }
          else if (inicio !== fimAnterior + 1)
          {
            problemas.push(`${onde}: lacuna ${fimAnterior + 1}–${inicio - 1}`);
          }
        }
      }
    }

    expect(problemas).toEqual([]);
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
