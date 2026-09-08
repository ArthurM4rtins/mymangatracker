// O que popup e service worker compartilham. Sem bundler: o popup carrega por
// <script>, o service worker por importScripts. Tudo fica no objeto KIDOKU.
//
// Regra da extensão (desenho no vault): ZERO regra de negócio aqui. Quem
// decide se o progresso avança é o servidor. Este arquivo só extrai, pareia e
// autentica.
globalThis.KIDOKU = (function ()
{
  // Onde o app mora. Ordem = preferência: produção primeiro, dev depois. A
  // sessão é procurada nos dois e o primeiro que tiver cookie ganha, então em
  // desenvolvimento basta estar logado no localhost.
  const AMBIENTES = ["https://mymangatracker.vercel.app", "http://localhost:3000"];

  const COOKIE_DE_SESSAO = "kidoku_sessao";

  // A MESMA regex de src/server/domain/titulo-de-capitulo.ts, reescrita aqui
  // porque a extensão não importa do app. Se uma mudar, a outra muda junto.
  const CAPITULO = /\b(?:chapters?|chap|cap[íi]tulos?|caps?|ch)\b\.?\s*#?\s*(\d+(?:[.,]\d+)?)/i;

  // Segmento de URL que anuncia o capítulo: "chapter", "ch", "cap", "chapter-12".
  const SEGMENTO_DE_CAPITULO = /^(?:chapters?|chap|caps?|ch)(?:[-_]?\d+.*)?$/i;

  /**
   * O capítulo anunciado no título da aba, ou null. Nunca chuta: número solto
   * ("Vagabond 2") não é capítulo. Arredonda a duas casas, o teto da coluna.
   */
  function capituloDoTitulo(titulo)
  {
    const encontrado = CAPITULO.exec(titulo || "");

    if (encontrado === null)
    {
      return null;
    }

    const numero = Math.round(Number(encontrado[1].replace(",", ".")) * 100) / 100;

    return numero > 0 && numero <= 999999.99 ? numero : null;
  }

  /**
   * A chave que identifica a OBRA nesta aba, para pré-selecionar e acender o
   * badge no próximo capítulo. Duas formas:
   *
   * 1. host + caminho até o segmento do capítulo — MangaFire:
   *    mangafire.to/title/4mx-vagabondd/chapter/4745884 → "mangafire.to/title/4mx-vagabondd".
   * 2. Sem slug na URL (MangaDex: /chapter/<uuid>), host + o maior pedaço do
   *    título depois de tirar o capítulo e o nome do site:
   *    "1 | Chapter 2 - Vagabond - MangaDex" → "mangadex.org#vagabond".
   *
   * É pareamento de conveniência, guardado só no navegador: errar aqui só
   * pré-seleciona a obra errada, que fica visível para a pessoa corrigir.
   */
  function chaveDaObra(url, titulo)
  {
    let endereco;

    try
    {
      endereco = new URL(url);
    }
    catch
    {
      return null;
    }

    if (endereco.protocol !== "http:" && endereco.protocol !== "https:")
    {
      return null;
    }

    const segmentos = endereco.pathname.split("/").filter(Boolean);
    const indice = segmentos.findIndex(function (s) { return SEGMENTO_DE_CAPITULO.test(s); });
    const base = indice > 0 ? segmentos.slice(0, indice) : indice === 0 ? [] : segmentos;

    if (base.length > 0 && indice !== -1)
    {
      return endereco.host + "/" + base.join("/");
    }

    const semCapitulo = (titulo || "").replace(CAPITULO, " ");
    const nome = semCapitulo
      .split(/\s*[|\-–—:·]\s*/)
      .map(function (parte) { return parte.trim(); })
      .filter(function (parte) { return parte.length > 1 && !/^\d+$/.test(parte); })
      .sort(function (a, b) { return b.length - a.length; })[0];

    return nome ? endereco.host + "#" + nome.toLowerCase() : null;
  }

  /**
   * A sessão do site, se houver: lê o cookie do nosso domínio (por isso a
   * permissão `cookies` + host_permissions) e devolve base + token. O token vai
   * em `Authorization: Bearer`, porque cookie sameSite=lax não sai de
   * chrome-extension://. Mesmo JWT, mesma verificação no servidor.
   */
  async function sessao()
  {
    for (const base of AMBIENTES)
    {
      const cookie = await chrome.cookies.get({ url: base, name: COOKIE_DE_SESSAO });

      if (cookie && cookie.value)
      {
        return { base, token: cookie.value };
      }
    }

    return null;
  }

  async function paresSalvos()
  {
    const guardado = await chrome.storage.local.get("pares");

    return guardado.pares || {};
  }

  async function salvarPar(chave, entradaId)
  {
    const pares = await paresSalvos();
    pares[chave] = entradaId;
    await chrome.storage.local.set({ pares });
  }

  // --- Nome da obra (#171): o MESMO algoritmo de src/server/domain/obra-do-titulo.ts.
  // Se um mudar, o outro muda junto.

  // Capítulo escrito à japonesa/chinesa: "第68話", "第12章".
  const CAPITULO_CJK = /第\s*\d+(?:[.,]\d+)?\s*[話话章]/;
  const SEPARADOR = /\s*[|\-–—:·]\s*/;
  // Ano entre parênteses no fim: "Berserk (2016)" é desambiguação de catálogo, não nome.
  const ANO = /\s*\(\d{4}\)\s*$/;

  /** Os pedaços do título que podem ser a obra, do maior para o menor. */
  function pedacosDoTitulo(titulo)
  {
    return (titulo || "")
      .replace(CAPITULO, " ")
      .replace(CAPITULO_CJK, " ")
      .split(SEPARADOR)
      .map(function (parte) { return parte.trim(); })
      .filter(function (parte) { return parte.length > 1 && !/^\d+$/.test(parte); })
      .sort(function (a, b) { return b.length - a.length; });
  }

  /** Minúsculas, sem acento, sem pontuação, sem ano. NFC recompõe o Hangul. */
  function normalizarNomeDeObra(nome)
  {
    return nome
      .replace(ANO, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .normalize("NFC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * O entradaId cuja obra bate com algum pedaço do título, ou null. Empate
   * (duas obras com o mesmo nome) é null: a pessoa escolhe. Errar aqui só
   * pré-seleciona a obra errada, visível para corrigir antes do clique.
   */
  function casarObraPeloTitulo(titulo, entradas)
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
        return [entrada.obra.titleRomaji, entrada.obra.titleEnglish, entrada.obra.titleNative]
          .some(function (t) { return t && normalizarNomeDeObra(t) === alvo; });
      });

      if (candidatas.length === 1)
      {
        return candidatas[0].entradaId;
      }

      if (candidatas.length > 1)
      {
        return null;
      }
    }

    return null;
  }

  return {
    AMBIENTES,
    capituloDoTitulo,
    chaveDaObra,
    casarObraPeloTitulo,
    sessao,
    paresSalvos,
    salvarPar,
  };
})();
