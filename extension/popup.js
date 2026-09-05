// O popup: tela única (decisão 4 do desenho). Extratores só pré-preenchem obra
// e capítulo; quem confirma é a pessoa, num clique. Nada é gravado sem o clique,
// e o capítulo gravado é sempre o que está visível no campo.

const el = {
  estado: document.getElementById("estado"),
  formulario: document.getElementById("formulario"),
  pagina: document.getElementById("pagina"),
  filtro: document.getElementById("filtro"),
  obra: document.getElementById("obra"),
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
    const cap = entrada.progressChapter === null ? "" : ` — no cap. ${entrada.progressChapter}`;
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
    mostrar("o Kidoku não respondeu agora — tente de novo");
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
    mostrar("não deu para carregar a estante — tente de novo");
    return;
  }

  const { entradas } = await resposta.json();
  // Concluída não entra: registrar leitura nela não faz sentido (decisão 7).
  const abertas = entradas.filter(function (e) { return e.status !== "COMPLETED"; });

  if (abertas.length === 0)
  {
    mostrar("sua estante não tem obra em aberto — adicione uma no site.");
    return;
  }

  const chave = KIDOKU.chaveDaObra(aba && aba.url, aba && aba.title);
  const pares = await KIDOKU.paresSalvos();
  const pareada = chave !== null && pares[chave] && abertas.some(function (e) { return e.entradaId === pares[chave]; })
    ? pares[chave]
    : null;
  const capitulo = KIDOKU.capituloDoTitulo(aba && aba.title);

  contexto = { aba, sessao, abertas, chave };

  el.pagina.textContent = aba && aba.title ? aba.title : "";
  el.pagina.title = aba && aba.url ? aba.url : "";
  preencherObras(abertas, "", pareada);
  el.capitulo.value = capitulo === null ? "" : String(capitulo);
  el.origem.textContent = capitulo === null
    ? "não achei o capítulo no título da aba — digite"
    : "lido do título da aba — confira";

  el.estado.hidden = true;
  el.formulario.hidden = false;
  (pareada === null ? el.filtro : el.capitulo).focus();
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
    el.resultado.textContent = "escolha a obra";
    return;
  }

  if (el.capitulo.value.trim() === "" || !Number.isFinite(capitulo) || capitulo <= 0)
  {
    el.resultado.className = "resultado erro";
    el.resultado.textContent = "informe o capítulo";
    el.capitulo.focus();
    return;
  }

  el.registrar.disabled = true;
  el.resultado.className = "resultado";
  el.resultado.textContent = "registrando…";

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
      el.resultado.textContent = (corpo.erros && corpo.erros._geral) || "não deu para registrar";
      return;
    }

    el.resultado.className = "resultado ok";
    el.resultado.textContent = corpo.progresso === corpo.capitulo
      ? `cap. ${corpo.capitulo} registrado — estante no ${corpo.progresso}`
      : `cap. ${corpo.capitulo} registrado — estante segue no ${corpo.progresso}`;

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
    el.resultado.textContent = "o Kidoku não respondeu agora — tente de novo";
  }
  finally
  {
    el.registrar.disabled = false;
  }
});

void iniciar();
