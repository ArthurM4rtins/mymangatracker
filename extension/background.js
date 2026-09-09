// Service worker do MV3: observa as abas para acender o badge quando a página
// é de uma obra já pareada, e — com a chave ligada — registra sozinho o
// capítulo que avança (#173). Até a #173 nada aqui escrevia no servidor
// (decisão 8 do desenho); agora escreve, sob as seis condições de
// `agendarAutoRegistro`, e o servidor continua sendo quem decide se avança.
importScripts("comum.js");

// Tres estados, tres cores: pareada (ambar, a do site), registrado sozinho
// (verde) e falhou ao registrar (vermelho). Os dois ultimos ficam ate a aba
// trocar de pagina — e o que a pessoa ve ao voltar para a aba.
const COR_PAREADA = "#f0a842";
const COR_REGISTRADO = "#3c9d5d";
const COR_FALHOU = "#d6402b";

/** Quanto tempo a pessoa precisa ficar na página antes do registro automático. */
const AUTO_ESPERA_MS = 20_000;

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

    // O que o registro automatico fez NESTA aba, NESTA pagina, ganha do "pareada":
    // trocar de pagina e o que limpa (o mapa e por URL).
    const { autoResultado = {} } = await chrome.storage.session.get("autoResultado");
    const resultado = autoResultado[tabId];

    if (resultado !== undefined && resultado.url === url)
    {
      await chrome.action.setBadgeText({ tabId, text: resultado.ok ? "✓" : "!" });
      await chrome.action.setBadgeBackgroundColor({ tabId, color: resultado.ok ? COR_REGISTRADO : COR_FALHOU });
      return;
    }

    // O par tem que ser DESTA sessão (#181): `chrome.storage` é do navegador,
    // não da conta. Antes bastava o par existir, e o badge de uma conta acendia
    // para a outra, prometendo registro numa página que o popup abriria sem
    // obra selecionada.
    const sessao = await KIDOKU.sessao();
    const pareada = sessao !== null
      && (await KIDOKU.parDaSessao(chave, sessao.token)) !== null;

    await chrome.action.setBadgeText({ tabId, text: pareada ? "●" : "" });

    if (pareada)
    {
      await chrome.action.setBadgeBackgroundColor({ tabId, color: COR_PAREADA });
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

  // Mesma regra do badge: par de outra conta não agenda nada (#181). A
  // checagem contra a estante, em `tentarAutoRegistro`, continua sendo a que
  // vale — esta só evita agendar o que já se sabe que não é desta sessão.
  const sessao = await KIDOKU.sessao();
  const entradaId = sessao === null
    ? null
    : await KIDOKU.parDaSessao(chave, sessao.token);

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
    void tentarAutoRegistro({ tabId, url, titulo, capitulo, entradaId, marca });
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

async function tentarAutoRegistro({ tabId, url, titulo, capitulo, entradaId, marca })
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

    // 200 registrou; 409 é `nao_avanca`, resposta normal e silenciosa. Os dois
    // fecham a marca — não há por que tentar de novo o mesmo capítulo nesta aba.
    // Qualquer outra resposta é falha: badge vermelho, e a próxima mudança de
    // título tenta outra vez.
    if (resposta.status !== 200 && resposta.status !== 409)
    {
      await marcarResultado(tabId, url, titulo, false);
      return;
    }

    await lembrarFeito(marca);

    if (resposta.status !== 200)
    {
      return;
    }

    // O badge verde e o sinal; o desfazer e o reset na estante, que o popup ja
    // alcanca pelo "abrir o site". Sem aviso a mais no popup, por decisao do usuario.
    await marcarResultado(tabId, url, titulo, true);
  }
  catch
  {
    // Aba fechou, worker foi dormir: nada grava, a pessoa clica. Rede caida
    // no meio do fetch cai aqui tambem — vale como falha visivel.
    await marcarResultado(tabId, url, titulo, false).catch(function () {});
  }
}

/** Guarda o resultado por aba e URL e repinta o badge: verde ficou, vermelho falhou. */
async function marcarResultado(tabId, url, titulo, ok)
{
  const { autoResultado = {} } = await chrome.storage.session.get("autoResultado");
  autoResultado[tabId] = { url, ok };
  await chrome.storage.session.set({ autoResultado });
  await atualizarBadge(tabId, url, titulo);
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
