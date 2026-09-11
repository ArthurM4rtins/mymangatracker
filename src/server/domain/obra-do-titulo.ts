/**
 * O NOME da obra a partir do título da aba, e o casamento com a estante (#171).
 *
 * A extensão já tira o capítulo do `document.title`; o nome sai do mesmo lugar.
 * Errar o casamento só pré-seleciona a obra errada, visível para a pessoa
 * corrigir antes de clicar — por isso pode ser aproximado. O que não pode é
 * escolher entre duas: empate é `null`, e a pessoa escolhe.
 *
 * Espelhado em `extension/comum.js`, como a regex de capítulo. Se um mudar, o
 * outro muda junto.
 *
 * Módulo de domínio: puro, sem import do projeto, sem rede.
 */

/** A mesma regex de `titulo-de-capitulo.ts`, para tirar o capítulo do título. */
const CAPITULO = /\b(?:chapters?|chap|cap[íi]tulos?|caps?|ch)\b\.?\s*#?\s*(\d+(?:[.,]\d+)?)/i;

/** Capítulo escrito à japonesa/chinesa: "第68話", "第12章". */
const CAPITULO_CJK = /第\s*\d+(?:[.,]\d+)?\s*[話话章]/;

/** Separadores que os sites usam entre obra, capítulo e nome do site. */
const SEPARADOR = /\s*[|\-–—:·]\s*/;

/** Ano entre parênteses no fim: "Berserk (2016)". Desambiguação de catálogo, não nome. */
const ANO = /\s*\(\d{4}\)\s*$/;

/**
 * Os pedaços do título que podem ser o nome da obra, do maior para o menor,
 * depois de tirar capítulo e separadores. Pedaço curto ou só numérico fica de
 * fora.
 *
 * O maior nem sempre é a obra: em "1 | Chapter 68 - Berserk - MangaDex" o maior
 * é o nome do site. Por isso o casamento testa TODOS, e não só o primeiro.
 */
export function pedacosDoTitulo(titulo: string): string[]
{
  const semCapitulo = titulo.replace(CAPITULO, " ").replace(CAPITULO_CJK, " ");

  return semCapitulo
    .split(SEPARADOR)
    .map(function (parte) { return parte.trim(); })
    .filter(function (parte) { return parte.length > 1 && !/^\d+$/.test(parte); })
    .sort(function (a, b) { return b.length - a.length; });
}

/** O maior pedaço — o que `chaveDaObra` da extensão usa para a chave de pareamento. */
export function nomeDaObraNoTitulo(titulo: string): string | null
{
  return pedacosDoTitulo(titulo)[0] ?? null;
}

/**
 * A forma de comparação: minúsculas, sem acento, sem pontuação, sem ano,
 * espaços colapsados. "Berserk (2016)" e "berserk" são a mesma obra.
 */
export function normalizarNomeDeObra(nome: string): string
{
  return nome
    .replace(ANO, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // NFD separou os acentos latinos para tira-los; NFC recompoe o que sobrou -
    // sem isso o Hangul fica em jamo solto e nao bate com o titulo da estante.
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type EntradaCasavel = {
  entradaId: string;
  /** Romaji, inglês e nativo, na ordem que vier — `null` onde não há. */
  titulos: ReadonlyArray<string | null>;
};

/**
 * A entrada cujo nome bate com algum pedaço do título, ou `null` quando nenhuma
 * bate ou mais de uma bate no mesmo pedaço. Casamento é por igualdade da forma
 * normalizada, pedaço a pedaço, do maior para o menor.
 */
export function casarObraPeloTitulo(
  titulo: string,
  entradas: ReadonlyArray<EntradaCasavel>,
): string | null
{
  for (const pedaco of pedacosDoTitulo(titulo))
  {
    const alvo = normalizarNomeDeObra(pedaco);

    if (alvo === "")
    {
      continue;
    }

    const candidatas = entradas.filter(function (entrada)
    {
      return entrada.titulos.some(function (t)
      {
        return t !== null && normalizarNomeDeObra(t) === alvo;
      });
    });

    if (candidatas.length === 1)
    {
      return candidatas[0].entradaId;
    }

    if (candidatas.length > 1)
    {
      // Empate: duas obras com o mesmo nome. Não escolher é a resposta certa.
      return null;
    }
  }

  return null;
}
