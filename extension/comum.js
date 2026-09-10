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

  async function salvarPar(chave, entradaId, dono)
  {
    const pares = await paresSalvos();
    pares[chave] = { entradaId, dono };
    await chrome.storage.local.set({ pares });
  }

  // --- De quem é o par (#181) ---
  //
  // `chrome.storage.local` é do NAVEGADOR, não da conta. O popup já tratava
  // isso — só usa o par se o `entradaId` estiver na estante de quem está
  // logado —, mas o service worker acendia o badge só por o par existir. Com
  // duas contas no mesmo navegador, o badge prometia "dá pra registrar aqui"
  // numa página que o popup abriria sem obra selecionada.

  /**
   * O `sub` do JWT de sessão, que é o id de quem está logado.
   *
   * A assinatura NÃO é verificada aqui, e não pode ser: a extensão não tem o
   * segredo. Isto serve só para separar pares dentro do navegador — nunca para
   * autorizar nada. Quem decide o que a pessoa pode é o servidor, a cada
   * requisição, com o token inteiro.
   */
  function donoDoToken(token)
  {
    const partes = (token || "").split(".");

    if (partes.length !== 3)
    {
      return null;
    }

    try
    {
      const payload = JSON.parse(atob(partes[1].replace(/-/g, "+").replace(/_/g, "/")));

      return typeof payload.sub === "string" ? payload.sub : null;
    }
    catch
    {
      return null;
    }
  }

  /** O `entradaId` do par, se ele for de quem está logado. Senão, `null`. */
  function parDoDono(pares, chave, dono)
  {
    if (chave === null || dono === null)
    {
      return null;
    }

    const par = (pares || {})[chave];

    // Formato antigo (string solta): guardado antes desta correção, sem saber
    // de quem é. Adivinhar seria repetir o bug — um clique no popup pareia de
    // novo, que é barato.
    if (par === undefined || typeof par !== "object")
    {
      return null;
    }

    return par.dono === dono ? par.entradaId : null;
  }

  /**
   * Vale gravar o par site→obra com esta resposta do servidor?
   *
   * O par diz "esta página é esta obra", e isso continua verdade quando o
   * capítulo NÃO avança: o servidor achou a entrada, reconheceu a obra e só
   * recusou mexer no progresso. Parear só com 200 fazia obra já lida além
   * daquele capítulo nunca parear — quem reabre um capítulo antigo para reler
   * ficava sem badge naquele site para sempre.
   *
   * Recusa de pedido, sessão morta e falha do servidor não pareiam: nesses
   * casos ninguém confirmou obra nenhuma.
   */
  function deveParear(status)
  {
    return status === 200 || status === 409;
  }

  /** O par desta aba para a sessão atual, resolvendo tudo de uma vez. */
  async function parDaSessao(chave, token)
  {
    return parDoDono(await paresSalvos(), chave, donoDoToken(token));
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
    donoDoToken,
    parDoDono,
    parDaSessao,
    deveParear,
  };
})();
