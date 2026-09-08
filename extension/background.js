// Service worker do MV3: observa as abas para acender o badge quando a página
// é de uma obra já pareada, e — com a chave ligada — registra sozinho o
// capítulo que avança (#173). Até a #173 nada aqui escrevia no servidor
// (decisão 8 do desenho); agora escreve, sob as seis condições de
// `agendarAutoRegistro`, e o servidor continua sendo quem decide se avança.
importScripts("comum.js");

const COR_DO_BADGE = "#d6402b";
const COR_DO_REGISTRADO = "#3c9d5d";

/** Quanto tempo a pessoa precisa ficar na página antes do registro automático. */
const AUTO_ESPERA_MS = 20_000;

/** Quanto tempo o badge fica em "registrado" antes de voltar ao de pareada. */
const AUTO_BADGE_MS = 4_000;

/** Timers pendentes por aba: um agendamento novo cancela o anterior da mesma aba. */
const pendentes = new Map();

// Melhor esforco: entre o evento e a escrita ha tres `await`, e a aba pode
// fechar ou navegar no meio — o Chrome rejeita com "No tab with id" (#167).
// Badge de aba que nao existe mais nao e erro, entao morre aqui, na origem, e
// nao em cada chamador.
async function atualizarBadge(tabId, url, titulo)
{
  try
  {
    const chave = KIDOKU.chaveDaObra(url, titulo);

    if (chave === null)
    {
      await chrome.action.setBadgeText({ tabId, text: "" });
      return;
    }

    const pares = await KIDOKU.paresSalvos();
    const pareada = Object.prototype.hasOwnProperty.call(pares, chave);

    await chrome.action.setBadgeText({ tabId, text: pareada ? "●" : "" });

    if (pareada)
    {
      await chrome.action.setBadgeBackgroundColor({ tabId, color: COR_DO_BADGE });
    }
  }
  catch
  {
    // A aba sumiu. Nada a fazer e nada a avisar.
  }
}

/**
 * As seis condições do registro automático (desenho da #173). Aqui entram as
 * que dá para saber na hora: chave ligada, obra pareada, capítulo no título.
 * As de tempo e foco ficam para `tentarAutoRegistro`, depois da espera.
 */
async function agendarAutoRegistro(tabId, url, titulo)
{
  const anterior = pendentes.get(tabId);

  if (anterior !== undefined)
  {
    clearTimeout(anterior);
    pendentes.delete(tabId);
  }

  const { autoRegistro } = await chrome.storage.local.get("autoRegistro");

  if (autoRegistro !== true)
  {
    return;
  }

  const chave = KIDOKU.chaveDaObra(url, titulo);
  const capitulo = KIDOKU.capituloDoTitulo(titulo);

  if (chave === null || capitulo === null)
  {
    return;
  }

  const pares = await KIDOKU.paresSalvos();
  const entradaId = pares[chave];

  if (!entradaId)
  {
    return;
  }

  const marca = `${tabId}|${chave}|${capitulo}`;
  const { autoFeitos = [] } = await chrome.storage.session.get("autoFeitos");

  if (autoFeitos.includes(marca))
  {
    return;
  }

  const timer = setTimeout(function ()
  {
    pendentes.delete(tabId);
    void tentarAutoRegistro({ tabId, url, titulo, chave, capitulo, entradaId, marca });
  }, AUTO_ESPERA_MS);

  pendentes.set(tabId, timer);
}

/** Depois da espera: a pessoa ainda está lá, olhando para a mesma página? */
async function aindaNaPagina(tabId, url, capitulo)
{
  let aba;

  try
  {
    aba = await chrome.tabs.get(tabId);
  }
  catch
  {
    return false;
  }

  if (!aba.active || aba.url !== url || KIDOKU.capituloDoTitulo(aba.title) !== capitulo)
  {
    return false;
  }

  const janela = await chrome.windows.getLastFocused();

  return janela.focused === true && janela.id === aba.windowId;
}

async function tentarAutoRegistro({ tabId, url, titulo, chave, capitulo, entradaId, marca })
{
  try
  {
    if (!(await aindaNaPagina(tabId, url, capitulo)))
    {
      return;
    }

    const sessao = await KIDOKU.sessao();

    if (sessao === null)
    {
      return;
    }

    // O par tem que ser desta sessão: `chrome.storage` é do navegador, não da
    // conta (#181). Par de outra conta não grava em lugar nenhum.
    const estante = await fetch(sessao.base + "/api/v1/estante", {
      headers: { Authorization: "Bearer " + sessao.token },
    });

    if (!estante.ok)
    {
      return;
    }

    const { entradas } = await estante.json();
    const minha = entradas.some(function (e)
    {
      return e.entradaId === entradaId && e.status !== "COMPLETED";
    });

    if (!minha)
    {
      return;
    }

    const resposta = await fetch(sessao.base + "/api/v1/leitura", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + sessao.token,
      },
      body: JSON.stringify({ entradaId, capitulo, url }),
    });

    // 200 registrou; 409 é `nao_avanca`, resposta normal. Os dois fecham a
    // marca — não há por que tentar de novo o mesmo capítulo nesta aba. Erro
    // de rede não fecha: a próxima mudança de título tenta outra vez.
    if (resposta.status !== 200 && resposta.status !== 409)
    {
      return;
    }

    await lembrarFeito(marca);

    if (resposta.status !== 200)
    {
      return;
    }

    const { autoUltimo = {} } = await chrome.storage.session.get("autoUltimo");
    autoUltimo[tabId] = { capitulo, chave };
    await chrome.storage.session.set({ autoUltimo });

    await chrome.action.setBadgeText({ tabId, text: "✓" });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: COR_DO_REGISTRADO });

    setTimeout(function () { void atualizarBadge(tabId, url, titulo); }, AUTO_BADGE_MS);
  }
  catch
  {
    // Aba fechou, rede caiu, worker foi dormir: nada grava, a pessoa clica.
  }
}

async function lembrarFeito(marca)
{
  const { autoFeitos = [] } = await chrome.storage.session.get("autoFeitos");

  if (!autoFeitos.includes(marca))
  {
    autoFeitos.push(marca);
    await chrome.storage.session.set({ autoFeitos });
  }
}

// SPAs (MangaFire, MangaDex) mudam o título depois do load: ouvir os dois.
chrome.tabs.onUpdated.addListener(function (tabId, mudanca, aba)
{
  if (mudanca.status === "complete" || mudanca.title !== undefined)
  {
    void atualizarBadge(tabId, aba.url, aba.title);
    void agendarAutoRegistro(tabId, aba.url, aba.title);
  }
});

chrome.tabs.onActivated.addListener(async function ({ tabId })
{
  try
  {
    const aba = await chrome.tabs.get(tabId);
    await atualizarBadge(tabId, aba.url, aba.title);
    await agendarAutoRegistro(tabId, aba.url, aba.title);
  }
  catch
  {
    // Aba fechou no meio: nada a fazer.
  }
});

chrome.tabs.onRemoved.addListener(function (tabId)
{
  const timer = pendentes.get(tabId);

  if (timer !== undefined)
  {
    clearTimeout(timer);
    pendentes.delete(tabId);
  }
});

// O popup avisa quando pareou uma obra nova: o badge da aba acende na hora.
chrome.runtime.onMessage.addListener(function (mensagem)
{
  if (mensagem && mensagem.tipo === "pareou" && typeof mensagem.tabId === "number")
  {
    void atualizarBadge(mensagem.tabId, mensagem.url, mensagem.titulo);
  }
});
