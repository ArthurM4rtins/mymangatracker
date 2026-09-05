// Service worker do MV3: observa as abas para acender o badge quando a página
// é de uma obra já pareada. Observar sempre, GRAVAR só no clique (decisão 8 do
// desenho): nada aqui escreve no servidor.
importScripts("comum.js");

const COR_DO_BADGE = "#d6402b";

async function atualizarBadge(tabId, url, titulo)
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

// SPAs (MangaFire, MangaDex) mudam o título depois do load: ouvir os dois.
chrome.tabs.onUpdated.addListener(function (tabId, mudanca, aba)
{
  if (mudanca.status === "complete" || mudanca.title !== undefined)
  {
    void atualizarBadge(tabId, aba.url, aba.title);
  }
});

chrome.tabs.onActivated.addListener(async function ({ tabId })
{
  try
  {
    const aba = await chrome.tabs.get(tabId);
    await atualizarBadge(tabId, aba.url, aba.title);
  }
  catch
  {
    // Aba fechou no meio: nada a fazer.
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
