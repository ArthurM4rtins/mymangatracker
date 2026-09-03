/** Regras puras do arquivo curado de sagas e arcos. */

type Registro = Record<string, unknown>;

const STATUS = ["VERIFIED", "DRAFT", "DISPUTED", "INSUFFICIENT_EVIDENCE", "NOT_APPLICABLE"];
const KIND = ["SAGA", "ARC"];

export function validarEstruturaNarrativa(estrutura: unknown): string[]
{
  if (!ehRegistro(estrutura))
  {
    return ["estrutura deve ser um objeto"];
  }

  const erros: string[] = [];
  const fontes = idsDeFontes(estrutura.sources);
  const segmentos = Array.isArray(estrutura.segments) ? estrutura.segments : [];
  const porChave = new Map<string, Registro>();

  segmentos.forEach(function (segmento)
  {
    if (ehRegistro(segmento) && typeof segmento.key === "string")
    {
      porChave.set(segmento.key, segmento);
    }
  });

  segmentos.forEach(function (segmento, indice)
  {
    const prefixo = `segments[${indice}]`;

    if (!ehRegistro(segmento))
    {
      erros.push(`${prefixo}: segmento deve ser um objeto`);
      return;
    }

    if (!intervalosDoSegmentoSaoValidos(segmento))
    {
      erros.push(`${prefixo}: intervalo inválido`);
    }

    if (!segmentoTemIdentidade(segmento))
    {
      erros.push(`${prefixo}: segmento sem key, kind, title ou status`);
    }

    if (typeof segmento.parentKey === "string")
    {
      const pai = porChave.get(segmento.parentKey);

      if (pai === undefined || pai.kind !== "SAGA")
      {
        erros.push(`${prefixo}: parentKey não aponta para saga`);
      }
    }

    if (segmento.status === "VERIFIED")
    {
      const sourceIds = Array.isArray(segmento.sourceIds) ? segmento.sourceIds : [];
      const temFonte = sourceIds.some(function (id)
      {
        return typeof id === "string" && fontes.has(id);
      });

      if (!temFonte)
      {
        erros.push(`${prefixo}: segmento verificado sem fonte`);
      }
    }
  });

  const curadoria = ehRegistro(estrutura.curation) ? estrutura.curation : undefined;

  if (curadoria === undefined || typeof curadoria.status !== "string" || !STATUS.includes(curadoria.status))
  {
    erros.push("curation.status inválido");
  }

  return erros;
}

function idsDeFontes(fontes: unknown): Set<string>
{
  if (!Array.isArray(fontes))
  {
    return new Set();
  }

  return new Set(fontes.flatMap(function (fonte)
  {
    return ehRegistro(fonte) && typeof fonte.id === "string" ? [fonte.id] : [];
  }));
}

/** Segmento sem identidade não é importável — o lote 2 chegou com `{name, range}` solto. */
function segmentoTemIdentidade(segmento: Registro): boolean
{
  return (
    typeof segmento.key === "string" &&
    typeof segmento.kind === "string" &&
    KIND.includes(segmento.kind) &&
    typeof segmento.title === "string" &&
    typeof segmento.status === "string" &&
    STATUS.includes(segmento.status)
  );
}

/**
 * Capítulo 0 existe (Fire Force tem o 00). Negativo não: o tracker só
 * registra capítulo positivo, e o prólogo do Berserk vai como decimal
 * (0.01–0.09, numeração do MangaDex), não como o "-16" de site editorial.
 */
function intervaloValido(intervalo: unknown): boolean
{
  if (!ehRegistro(intervalo) || intervalo.unit !== "CHAPTER")
  {
    return false;
  }

  const inicio = numeroNaoNegativo(intervalo.start);
  const fim = intervalo.end === null ? undefined : numeroNaoNegativo(intervalo.end);

  return inicio !== undefined && (fim === undefined || inicio <= fim);
}

function intervalosDoSegmentoSaoValidos(segmento: Registro): boolean
{
  if (segmento.range !== undefined && segmento.ranges !== undefined)
  {
    return false;
  }

  if (segmento.range !== undefined)
  {
    return intervaloValido(segmento.range);
  }

  return Array.isArray(segmento.ranges) && segmento.ranges.length > 0 && segmento.ranges.every(intervaloValido);
}

function numeroNaoNegativo(valor: unknown): number | undefined
{
  if (typeof valor !== "string" || !/^\d+(?:\.\d+)?$/.test(valor))
  {
    return undefined;
  }

  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : undefined;
}

function ehRegistro(valor: unknown): valor is Registro
{
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}
