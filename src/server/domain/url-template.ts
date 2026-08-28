/**
 * Derivacao do template de URL a partir do link do primeiro capitulo.
 *
 * O usuario cola o link do capitulo 1 uma vez por obra. O sistema quebra a URL em
 * segmentos e procura os que valem `1` — cada um e um candidato a ser o numero do
 * capitulo. Em `/title/Lookism/chapter/1/1` ha dois: o do capitulo e o da pagina.
 *
 * Nao se escolhe em silencio. A lista volta ordenada, com o segmento que vem logo
 * depois de um marcador (`chapter`, `cap`, `ch`) na frente, e a tela mostra o link
 * do capitulo 2 para o usuario confirmar num clique.
 */

export type CandidatoTemplate = {
  sourceHost: string;
  urlTemplate: string;
  segmentIndex: number;
};

const MARCADOR = "{chapter}";

/** Segmento que, quando antecede o numero, indica que ali esta o capitulo. */
const MARCADORES_DE_CAPITULO = new Set([
  "c",
  "ch",
  "cap",
  "capitulo",
  "capítulo",
  "chapter",
  "chapters",
]);

const PESO_COM_MARCADOR = 2;
const PESO_SEM_MARCADOR = 1;

/**
 * Candidatos a template, do mais provavel para o menos.
 *
 * @param urlDoCapitulo1 - URL absoluta do primeiro capitulo, como o usuario colou.
 * @throws quando a URL nao e absoluta ou nao tem host.
 */
export function derivarCandidatos(urlDoCapitulo1: string): CandidatoTemplate[]
{
  const url = interpretarUrl(urlDoCapitulo1);
  const segmentos = url.pathname.split("/").slice(1);

  const candidatos: Array<CandidatoTemplate & { peso: number }> = [];

  segmentos.forEach(function (segmento, indice)
  {
    if (segmento !== "1")
    {
      return;
    }

    const anterior = indice > 0 ? segmentos[indice - 1].toLowerCase() : "";
    const peso = MARCADORES_DE_CAPITULO.has(anterior)
      ? PESO_COM_MARCADOR
      : PESO_SEM_MARCADOR;

    candidatos.push({
      sourceHost: url.host,
      urlTemplate: montarTemplate(segmentos, indice),
      segmentIndex: indice,
      peso,
    });
  });

  candidatos.sort(function (a, b)
  {
    return b.peso - a.peso || a.segmentIndex - b.segmentIndex;
  });

  return candidatos.map(function (candidato)
  {
    return {
      sourceHost: candidato.sourceHost,
      urlTemplate: candidato.urlTemplate,
      segmentIndex: candidato.segmentIndex,
    };
  });
}

/**
 * Monta o link de um capitulo a partir do template guardado em `ReadingSource`.
 *
 * @throws quando o template nao tem `{chapter}` ou o capitulo nao e positivo.
 */
export function aplicarTemplate(template: string, chapter: number): string
{
  if (!Number.isFinite(chapter) || chapter <= 0)
  {
    return erro(`capitulo deve ser positivo, recebido ${chapter}`);
  }

  if (!template.includes(MARCADOR))
  {
    return erro(`template sem ${MARCADOR}: ${template}`);
  }

  return template.split(MARCADOR).join(String(chapter));
}

function interpretarUrl(valor: string): URL
{
  let url: URL;

  try
  {
    url = new URL(valor);
  }
  catch
  {
    return erro(`URL inválida, precisa ser absoluta: ${valor}`);
  }

  if (url.host === "")
  {
    return erro(`URL inválida, sem host: ${valor}`);
  }

  return url;
}

function montarTemplate(segmentos: string[], indice: number): string
{
  const substituidos = segmentos.map(function (segmento, i)
  {
    return i === indice ? MARCADOR : segmento;
  });

  return `/${substituidos.join("/")}`;
}

function erro(mensagem: string): never
{
  throw new Error(mensagem);
}
