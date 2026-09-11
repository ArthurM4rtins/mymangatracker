// O popup: tela unica (decisao 4 do desenho). Extratores só pré-preenchem obra
// e capítulo; quem confirma é a pessoa, num clique. Nada é gravado sem o clique,
// e o capítulo gravado é sempre o que está visível no campo.

const el = {
  estado: document.getElementById("estado"),
  ambiente: document.getElementById("ambiente"),
  formulario: document.getElementById("formulario"),
  paginaUrl: document.getElementById("pagina-url"),
  verLink: document.getElementById("ver-link"),
  paginaTitulo: document.getElementById("pagina-titulo"),
  filtro: document.getElementById("filtro"),
  obra: document.getElementById("obra"),
  faixa: document.getElementById("faixa"),
  faixaTexto: document.getElementById("faixa-texto"),
  obraOrigem: document.getElementById("obra-origem"),
  capitulo: document.getElementById("capitulo"),
  origem: document.getElementById("origem"),
  registrar: document.getElementById("registrar"),
  auto: document.getElementById("auto"),
  resultado: document.getElementById("resultado"),
  semSessao: document.getElementById("sem-sessao"),
  entrar: document.getElementById("entrar"),
  abrirSite: document.getElementById("abrir-site"),
};

let contexto = null;
// A obra escolhida. Era `select.value`; com a listbox a fonte de verdade passa
// a ser esta variavel, e o DOM reflete ela.
let escolhida = null;

function mostrar(mensagem)
{
  el.estado.hidden = false;
  el.estado.textContent = mensagem;
}

function tituloDaEntrada(entrada)
{
  return entrada.obra.titleEnglish || entrada.obra.titleRomaji;
}

/** O titulo com o trecho que casou com o filtro em destaque, sem innerHTML. */
function tituloComDestaque(titulo, termo)
{
  const alvo = document.createElement("span");
  alvo.className = "item-titulo";

  const posicao = termo === "" ? -1 : titulo.toLowerCase().indexOf(termo);

  if (posicao === -1)
  {
    alvo.textContent = titulo;
    return alvo;
  }

  const marca = document.createElement("mark");
  marca.textContent = titulo.slice(posicao, posicao + termo.length);
  alvo.append(
    titulo.slice(0, posicao),
    marca,
    titulo.slice(posicao + termo.length),
  );

  return alvo;
}

/** As linhas que a listbox mostra agora, na ordem da tela. */
function itensVisiveis()
{
  return Array.from(el.obra.querySelectorAll(".item"));
}

/** Marca uma obra como escolhida: variavel, `aria-selected` e o foco do leitor. */
function escolher(entradaId)
{
  // Sempre string: `dataset.id` e string, o `entradaId` que vem da API nao
  // necessariamente. Comparar os dois sem isto nunca casa, e a linha escolhida
  // fica invisivel enquanto a variavel diz que existe.
  escolhida = entradaId === null || entradaId === undefined ? null : String(entradaId);

  for (const item of itensVisiveis())
  {
    const eEsta = item.dataset.id === escolhida;
    item.setAttribute("aria-selected", eEsta ? "true" : "false");

    if (eEsta)
    {
      el.obra.setAttribute("aria-activedescendant", item.id);
      item.scrollIntoView({ block: "nearest" });
    }
  }

  if (escolhida === null)
  {
    el.obra.removeAttribute("aria-activedescendant");
  }
}

function preencherObras(entradas, filtro, selecionada)
{
  const termo = filtro.trim().toLowerCase();
  const alvo = selecionada === null || selecionada === undefined ? null : String(selecionada);
  el.obra.replaceChildren();

  let aindaVisivel = false;

  for (const entrada of entradas)
  {
    const titulo = tituloDaEntrada(entrada);
    const texto = `${titulo} · ${entrada.obra.titleRomaji}`.toLowerCase();

    if (termo !== "" && !texto.includes(termo))
    {
      continue;
    }

    const item = document.createElement("div");
    item.className = "item";
    item.id = `obra-${entrada.entradaId}`;
    item.dataset.id = String(entrada.entradaId);
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", "false");
    item.append(tituloComDestaque(titulo, termo));

    // A segunda linha diz o progresso e — o que a janela nunca disse — qual
    // obra esta pareada com este site, que e o que acende o badge ●.
    const sub = document.createElement("span");
    sub.className = "item-sub";

    if (entrada.progressChapter !== null)
    {
      sub.append(FOLUNIO_I18N.texto("obraNoCapitulo", [String(entrada.progressChapter)]));
    }

    if (contexto !== null && entrada.entradaId === contexto.pareada)
    {
      const par = document.createElement("span");
      par.className = "item-par";
      par.textContent = FOLUNIO_I18N.texto("obraPareadaMarca");
      sub.append(sub.textContent === "" ? "" : " · ", par);
    }

    if (sub.textContent !== "")
    {
      item.append(sub);
    }

    el.obra.append(item);

    if (String(entrada.entradaId) === alvo)
    {
      aindaVisivel = true;
    }
  }

  if (el.obra.children.length === 0)
  {
    const vazio = document.createElement("p");
    vazio.className = "lista-vazia";
    vazio.textContent = FOLUNIO_I18N.texto("filtroSemResultado");
    el.obra.append(vazio);
  }

  // Filtrar pode ter tirado da tela a obra escolhida. Nesse caso a escolha
  // some junto — registrar o que nao esta visivel seria surpresa.
  escolher(aindaVisivel ? alvo : null);
}

/**
 * A faixa de estado: o mesmo badge que o `background.js` carimba no icone,
 * agora com legenda. A ordem e a MESMA do badge — o que o registro automatico
 * fez nesta aba, nesta pagina, ganha do "pareada".
 */
async function pintarFaixa(aba, pareada)
{
  const { autoResultado = {} } = await chrome.storage.session.get("autoResultado");
  const resultado = aba === undefined ? undefined : autoResultado[aba.id];

  if (resultado !== undefined && resultado.url === aba.url)
  {
    definirFaixa(
      resultado.ok ? "registrado" : "falhou",
      FOLUNIO_I18N.texto(resultado.ok ? "estadoRegistrado" : "estadoFalhou"),
    );
    return;
  }

  definirFaixa(
    pareada === null ? "sem-par" : "pareada",
    FOLUNIO_I18N.texto(pareada === null ? "estadoSemPar" : "estadoPareada"),
  );
}

function definirFaixa(estado, texto)
{
  el.faixa.dataset.estado = estado;
  el.faixaTexto.textContent = texto;
  el.faixa.hidden = false;
}

async function iniciar()
{
  const [aba] = await chrome.tabs.query({ active: true, currentWindow: true });
  const sessao = await FOLUNIO.sessao();
  const base = sessao ? sessao.base : FOLUNIO.AMBIENTES[0];

  // O host fica visivel (#148, item 9): o build distribuido embarca o localhost
  // e tenta producao primeiro, entao sem isto nada na tela distingue os dois.
  if (el.ambiente)
  {
    el.ambiente.textContent = new URL(base).host;
    el.ambiente.hidden = false;
  }

  el.abrirSite.href = base + "/estante";
  el.entrar.href = base + "/entrar";

  // A chave do registro automatico (#173) vive no navegador, nao na conta.
  const { autoRegistro } = await chrome.storage.local.get("autoRegistro");
  el.auto.checked = autoRegistro === true;

  if (sessao === null)
  {
    el.estado.hidden = true;
    el.semSessao.hidden = false;
    return;
  }

  let resposta;

  try
  {
    resposta = await fetch(base + "/api/v1/estante", {
      headers: { Authorization: "Bearer " + sessao.token },
    });
  }
  catch
  {
    mostrar(FOLUNIO_I18N.texto("semResposta"));
    return;
  }

  if (resposta.status === 401)
  {
    el.estado.hidden = true;
    el.semSessao.hidden = false;
    return;
  }

  if (!resposta.ok)
  {
    mostrar(FOLUNIO_I18N.texto("estanteNaoCarregou"));
    return;
  }

  const { entradas } = await resposta.json();
  // Concluída não entra: registrar leitura nela não faz sentido (decisão 7).
  const abertas = entradas.filter(function (e) { return e.status !== "COMPLETED"; });

  if (abertas.length === 0)
  {
    mostrar(FOLUNIO_I18N.texto("estanteVazia"));
    return;
  }

  const chave = FOLUNIO.chaveDaObra(aba && aba.url, aba && aba.title);
  // O par precisa ser desta conta (#181) E estar na estante aberta. A segunda
  // condicao ja existia e continua sendo a que vale de verdade; a primeira
  // evita ate considerar par de outra conta do mesmo navegador.
  const doDono = await FOLUNIO.parDaSessao(chave, sessao.token);
  const pareada = doDono !== null && abertas.some(function (e) { return e.entradaId === doDono; })
    ? doDono
    : null;
  // Sem par salvo, o nome no título da aba decide (#171). Par salvo ganha:
  // é o que a pessoa confirmou com um clique; o nome é só palpite.
  const peloTitulo = pareada === null
    ? FOLUNIO.casarObraPeloTitulo(aba && aba.title, abertas)
    : null;
  const selecionada = pareada !== null ? pareada : peloTitulo;
  const capitulo = FOLUNIO.capituloDoTitulo(aba && aba.title);

  contexto = { aba, sessao, abertas, chave, pareada };

  // A string que sai do navegador fica na tela antes do clique: e ela, nao o
  // titulo, que e gravada para sempre em ReadingProgress (issue #142).
  el.paginaUrl.textContent = aba && aba.url ? aba.url : "";
  el.paginaTitulo.textContent = aba && aba.title ? aba.title : "";
  preencherObras(abertas, "", selecionada);
  el.obraOrigem.hidden = peloTitulo === null;
  el.obraOrigem.textContent = peloTitulo === null ? "" : FOLUNIO_I18N.texto("obraPeloTitulo");
  el.capitulo.value = capitulo === null ? "" : String(capitulo);
  el.origem.textContent = FOLUNIO_I18N.texto(
    capitulo === null ? "capituloNaoLido" : "capituloLido",
  );

  await pintarFaixa(aba, pareada);

  el.estado.hidden = true;
  el.formulario.hidden = false;
  (selecionada === null ? el.filtro : el.capitulo).focus();
}

// --- Teclado da listbox ---
//
// Trocar `select` por `div` perde de graca o que o `select` dava: setas, Home,
// End e o anuncio do leitor de tela. Isto devolve.

/** Move a escolha `passo` linhas na ordem da tela; `passo` 0 vai para a ponta. */
function moverEscolha(passo, paraPonta)
{
  const itens = itensVisiveis();

  if (itens.length === 0)
  {
    return;
  }

  if (paraPonta !== undefined)
  {
    escolher(itens[paraPonta === "fim" ? itens.length - 1 : 0].dataset.id);
    return;
  }

  const atual = itens.findIndex(function (item) { return item.dataset.id === escolhida; });
  // Sem escolha, a primeira seta entra pela ponta que faz sentido para o sentido
  // do movimento — descendo entra pelo topo, subindo entra pelo fim.
  const proximo = atual === -1
    ? (passo > 0 ? 0 : itens.length - 1)
    : Math.min(Math.max(atual + passo, 0), itens.length - 1);

  escolher(itens[proximo].dataset.id);
}

el.obra.addEventListener("keydown", function (evento)
{
  const acoes = {
    ArrowDown: function () { moverEscolha(1); },
    ArrowUp: function () { moverEscolha(-1); },
    Home: function () { moverEscolha(0, "inicio"); },
    End: function () { moverEscolha(0, "fim"); },
  };

  const acao = acoes[evento.key];

  if (acao === undefined)
  {
    return;
  }

  // Sem isto a seta rola a lista em vez de andar na escolha, e a pagina inteira
  // pula com Home/End.
  evento.preventDefault();
  acao();
});

el.obra.addEventListener("click", function (evento)
{
  const item = evento.target.closest(".item");

  if (item !== null)
  {
    escolher(item.dataset.id);
    el.obra.focus();
  }
});

// Descer do filtro entra na lista: e o caminho que quem digita espera, e era
// o que o `select` dava sozinho quando recebia o foco.
el.filtro.addEventListener("keydown", function (evento)
{
  if (evento.key !== "ArrowDown")
  {
    return;
  }

  evento.preventDefault();
  el.obra.focus();
  moverEscolha(1);
});

el.filtro.addEventListener("input", function ()
{
  if (contexto === null)
  {
    return;
  }

  preencherObras(contexto.abertas, el.filtro.value, escolhida);
});

el.formulario.addEventListener("submit", async function (evento)
{
  evento.preventDefault();

  if (contexto === null)
  {
    return;
  }

  const entradaId = escolhida;
  const capitulo = Number(el.capitulo.value);

  if (!entradaId)
  {
    el.resultado.className = "resultado erro";
    el.resultado.textContent = FOLUNIO_I18N.texto("escolhaObra");
    return;
  }

  if (el.capitulo.value.trim() === "" || !Number.isFinite(capitulo) || capitulo <= 0)
  {
    el.resultado.className = "resultado erro";
    el.resultado.textContent = FOLUNIO_I18N.texto("informeCapitulo");
    el.capitulo.focus();
    return;
  }

  el.registrar.disabled = true;
  el.resultado.className = "resultado";
  el.resultado.textContent = FOLUNIO_I18N.texto("registrando");

  try
  {
    const resposta = await fetch(contexto.sessao.base + "/api/v1/leitura", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + contexto.sessao.token,
      },
      body: JSON.stringify({ entradaId, capitulo, url: contexto.aba.url }),
    });

    if (resposta.status === 401)
    {
      el.formulario.hidden = true;
      el.semSessao.hidden = false;
      return;
    }

    const corpo = await resposta.json().catch(function () { return {}; });

    // O par vem ANTES de decidir o que mostrar: ele diz "esta pagina e esta
    // obra", e isso vale mesmo quando o capitulo nao avanca (409). Preso ao
    // caminho de sucesso, obra ja lida alem daquele capitulo nunca pareava, e
    // o badge nunca acendia naquele site.
    if (FOLUNIO.deveParear(resposta.status) && contexto.chave !== null)
    {
      await FOLUNIO.salvarPar(contexto.chave, entradaId, FOLUNIO.donoDoToken(contexto.sessao.token));
      chrome.runtime.sendMessage({
        tipo: "pareou",
        tabId: contexto.aba.id,
        url: contexto.aba.url,
        titulo: contexto.aba.title,
      });
    }

    if (!resposta.ok)
    {
      el.resultado.className = "resultado erro";
      // A API responde codigo, nunca frase (fase 3 da #116): quem escolhe a
      // frase, no idioma de quem esta lendo, e quem mostra.
      // `progresso` vem junto no nao_avanca: a frase diz onde a estante esta (#172).
      el.resultado.textContent = FOLUNIO_I18N.erro(
        corpo.erros && corpo.erros._geral,
        corpo.progresso === undefined ? undefined : [String(corpo.progresso)],
      );
      return;
    }

    el.resultado.className = "resultado ok";
    // So o que avanca grava (#172): registrado implica estante no capitulo.
    el.resultado.textContent = FOLUNIO_I18N.texto(
      "registradoAlcancou",
      [String(corpo.capitulo), String(corpo.progresso)],
    );

  }
  catch
  {
    el.resultado.className = "resultado erro";
    el.resultado.textContent = FOLUNIO_I18N.texto("semResposta");
  }
  finally
  {
    el.registrar.disabled = false;
  }
});

el.verLink.addEventListener("click", function ()
{
  el.paginaUrl.hidden = !el.paginaUrl.hidden;
  el.verLink.textContent = FOLUNIO_I18N.texto(el.paginaUrl.hidden ? "verLink" : "ocultarLink");
});

el.auto.addEventListener("change", function ()
{
  void chrome.storage.local.set({ autoRegistro: el.auto.checked });
});

FOLUNIO_I18N.aplicar();
void iniciar();
