// O idioma do popup vem do NAVEGADOR, não do cookie do site: a extensão é do
// navegador de quem instalou, e o Chrome já resolve o fallback para `en`
// (`default_locale` no manifest) quando não tem o idioma pedido.
//
// `__MSG_x__` só é substituído em manifest e CSS, nunca no HTML — então o
// popup marca o que traduzir com `data-i18n` e este arquivo preenche antes de
// qualquer coisa aparecer.

globalThis.KIDOKU_I18N = (function ()
{
  function texto(nome, argumentos)
  {
    return chrome.i18n.getMessage(nome, argumentos);
  }

  /**
   * A frase de um código de erro da API. O servidor responde código, nunca
   * frase (fase 3 da #116). Código que esta versão da extensão não conhece cai
   * na frase genérica — nunca aparece cru para quem está lendo.
   */
  const FRASE_DO_ERRO = {
    corpo_invalido: "erroCorpoInvalido",
    pedido_invalido: "erroPedidoInvalido",
    entrada_nao_encontrada: "erroEntradaNaoEncontrada",
    capitulo_invalido: "erroCapituloInvalido",
    url_invalida: "erroUrlInvalida",
    sem_fonte: "erroSemFonte",
    limite_excedido: "erroLimiteExcedido",
    falha_interna: "erroFalhaInterna",
  };

  function erro(codigo)
  {
    const nome = FRASE_DO_ERRO[codigo];

    return (nome && texto(nome)) || texto("erroPadrao");
  }

  /** Preenche tudo que o HTML marcou, e o `lang` do documento. */
  function aplicar()
  {
    document.documentElement.lang = chrome.i18n.getUILanguage();

    for (const alvo of document.querySelectorAll("[data-i18n]"))
    {
      alvo.textContent = texto(alvo.dataset.i18n);
    }

    for (const alvo of document.querySelectorAll("[data-i18n-placeholder]"))
    {
      alvo.placeholder = texto(alvo.dataset.i18nPlaceholder);
    }
  }

  return { texto, erro, aplicar };
})();
