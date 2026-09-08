// O popup: tela unica (decisao 4 do desenho). Extratores só pré-preenchem obra
// e capítulo; quem confirma é a pessoa, num clique. Nada é gravado sem o clique,
// e o capítulo gravado é sempre o que está visível no campo.

const el = {
  estado: document.getElementById("estado"),
  formulario: document.getElementById("formulario"),
  paginaUrl: document.getElementById("pagina-url"),
  paginaTitulo: document.getElementById("pagina-titulo"),
  filtro: document.getElementById("filtro"),
  obra: document.getElementById("obra"),
  obraOrigem: document.getElementById("obra-origem"),
  capitulo: document.getElementById("capitulo"),
  origem: document.getElementById("origem"),
  registrar: document.getElementById("registrar"),
  resultado: document.getElementById("resultado"),
  semSessao: document.getElementById("sem-sessao"),
  entrar: document.getElementById("entrar"),
  abrirSite: document.getElementById("abrir-site"),
};

let contexto = null;

function mostrar(mensagem)
{
  el.estado.hidden = false;
  el.estado.textContent = mensagem;
}

function tituloDaEntrada(entrada)
{
  return entrada.obra.titleEnglish || entrada.obra.titleRomaji;
}

function preencherObras(entradas, filtro, selecionada)
{
  const termo = filtro.trim().toLowerCase();
  el.obra.replaceChildren();

  for (const entrada of entradas)
  {
    const titulo = tituloDaEntrada(entrada);
    const texto = `${titulo} · ${entrada.obra.titleRomaji}`.toLowerCase();

    if (termo !== "" && !texto.includes(termo))
    {
      continue;
    }

    const opcao = document.createElement("option");
    opcao.value = entrada.entradaId;
    const cap = entrada.progressChapter === null
      ? ""
      : KIDOKU_I18N.texto("obraNoCapitulo", [String(entrada.progressChapter)]);
    opcao.textContent = `${titulo}${cap}`;
    opcao.selected = entrada.entradaId === selecionada;
    el.obra.append(opcao);
  }
}

async function iniciar()
{
  const [aba] = await chrome.tabs.query({ active: true, currentWindow: true });
  const sessao = await KIDOKU.sessao();
  const base = sessao ? sessao.base : KIDOKU.AMBIENTES[0];

  el.abrirSite.href = base + "/estante";
  el.entrar.href = base + "/entrar";

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
    mostrar(KIDOKU_I18N.texto("semResposta"));
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
    mostrar(KIDOKU_I18N.texto("estanteNaoCarregou"));
    return;
  }

  const { entradas } = await resposta.json();
  // Concluída não entra: registrar leitura nela não faz sentido (decisão 7).
  const abertas = entradas.filter(function (e) { return e.status !== "COMPLETED"; });

  if (abertas.length === 0)
  {
    mostrar(KIDOKU_I18N.texto("estanteVazia"));
    return;
  }

  const chave = KIDOKU.chaveDaObra(aba && aba.url, aba && aba.title);
  const pares = await KIDOKU.paresSalvos();
  const pareada = chave !== null && pares[chave] && abertas.some(function (e) { return e.entradaId === pares[chave]; })
    ? pares[chave]
    : null;
  // Sem par salvo, o nome no título da aba decide (#171). Par salvo ganha:
  // é o que a pessoa confirmou com um clique; o nome é só palpite.
  const peloTitulo = pareada === null
    ? KIDOKU.casarObraPeloTitulo(aba && aba.title, abertas)
    : null;
  const selecionada = pareada !== null ? pareada : peloTitulo;
  const capitulo = KIDOKU.capituloDoTitulo(aba && aba.title);

  contexto = { aba, sessao, abertas, chave };

  // A string que sai do navegador fica na tela antes do clique: e ela, nao o
  // titulo, que e gravada para sempre em ReadingProgress (issue #142).
  el.paginaUrl.textContent = aba && aba.url ? aba.url : "";
  el.paginaTitulo.textContent = aba && aba.title ? aba.title : "";
  preencherObras(abertas, "", selecionada);
  el.obraOrigem.hidden = peloTitulo === null;
  el.obraOrigem.textContent = peloTitulo === null ? "" : KIDOKU_I18N.texto("obraPeloTitulo");
  el.capitulo.value = capitulo === null ? "" : String(capitulo);
  el.origem.textContent = KIDOKU_I18N.texto(
    capitulo === null ? "capituloNaoLido" : "capituloLido",
  );

  el.estado.hidden = true;
  el.formulario.hidden = false;
  (selecionada === null ? el.filtro : el.capitulo).focus();
}

el.filtro.addEventListener("input", function ()
{
  if (contexto === null)
  {
    return;
  }

  preencherObras(contexto.abertas, el.filtro.value, el.obra.value);
});

el.formulario.addEventListener("submit", async function (evento)
{
  evento.preventDefault();

  if (contexto === null)
  {
    return;
  }

  const entradaId = el.obra.value;
  const capitulo = Number(el.capitulo.value);

  if (!entradaId)
  {
    el.resultado.className = "resultado erro";
    el.resultado.textContent = KIDOKU_I18N.texto("escolhaObra");
    return;
  }

  if (el.capitulo.value.trim() === "" || !Number.isFinite(capitulo) || capitulo <= 0)
  {
    el.resultado.className = "resultado erro";
    el.resultado.textContent = KIDOKU_I18N.texto("informeCapitulo");
    el.capitulo.focus();
    return;
  }

  el.registrar.disabled = true;
  el.resultado.className = "resultado";
  el.resultado.textContent = KIDOKU_I18N.texto("registrando");

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

    if (!resposta.ok)
    {
      el.resultado.className = "resultado erro";
      // A API responde codigo, nunca frase (fase 3 da #116): quem escolhe a
      // frase, no idioma de quem esta lendo, e quem mostra.
      el.resultado.textContent = KIDOKU_I18N.erro(corpo.erros && corpo.erros._geral);
      return;
    }

    el.resultado.className = "resultado ok";
    el.resultado.textContent = KIDOKU_I18N.texto(
      corpo.progresso === corpo.capitulo ? "registradoAlcancou" : "registradoSegue",
      [String(corpo.capitulo), String(corpo.progresso)],
    );

    if (contexto.chave !== null)
    {
      await KIDOKU.salvarPar(contexto.chave, entradaId);
      chrome.runtime.sendMessage({
        tipo: "pareou",
        tabId: contexto.aba.id,
        url: contexto.aba.url,
        titulo: contexto.aba.title,
      });
    }
  }
  catch
  {
    el.resultado.className = "resultado erro";
    el.resultado.textContent = KIDOKU_I18N.texto("semResposta");
  }
  finally
  {
    el.registrar.disabled = false;
  }
});

KIDOKU_I18N.aplicar();
void iniciar();
