/**
 * O vocabulário de erro da API.
 *
 * O servidor responde CÓDIGO, não frase: quem mostra a mensagem — a tela, a
 * extensão — escolhe a frase no idioma de quem está lendo. O servidor não
 * precisa saber idioma, e também não precisa saber de qual botão veio o
 * clique: `sessao_necessaria` é a mesma condição atrás de "entre para avaliar"
 * e de "entre para comentar", e quem sabe qual ação foi tentada é a tela.
 *
 * Toda entrada aqui tem frase em `messages/*.json`, no namespace `erros`, e o
 * `tests/i18n/codigos-de-erro.test.ts` cobra os dois lados um contra o outro.
 * Uma tela pode preferir uma frase mais específica que a do catálogo — é o
 * caso de `falha_interna`, que vira "não foi possível salvar agora" na tela de
 * avaliação —; nesse caso a frase mora no namespace da tela.
 */
export const ERRO = {
  // 400 — o pedido não dá para interpretar.
  CORPO_INVALIDO: "corpo_invalido",
  PEDIDO_INVALIDO: "pedido_invalido",
  ANILIST_ID_INVALIDO: "anilist_id_invalido",
  OBRA_INVALIDA: "obra_invalida",
  STATUS_INVALIDO: "status_invalido",
  COMENTARIO_INVALIDO: "comentario_invalido",
  CURSOR_INVALIDO: "cursor_invalido",
  NOME_INVALIDO: "nome_invalido",

  // 400/401 — de propósito nos dois: o login não conta se o e-mail existe.
  CREDENCIAIS_INVALIDAS: "credenciais_invalidas",

  // 401 — não há sessão. Um código só para as onze frases "entre para X".
  SESSAO_NECESSARIA: "sessao_necessaria",

  // 404 — o recurso não existe, ou não é de quem pediu.
  OBRA_NAO_ENCONTRADA: "obra_nao_encontrada",
  OBRA_FORA_DO_CATALOGO: "obra_fora_do_catalogo",
  ENTRADA_NAO_ENCONTRADA: "entrada_nao_encontrada",
  LISTA_NAO_ENCONTRADA: "lista_nao_encontrada",
  LISTA_OU_OBRA_NAO_ENCONTRADA: "lista_ou_obra_nao_encontrada",
  RESENHA_NAO_ENCONTRADA: "resenha_nao_encontrada",
  COMENTARIO_NAO_ENCONTRADO: "comentario_nao_encontrado",
  AVALIACAO_NAO_ENCONTRADA: "avaliacao_nao_encontrada",
  USUARIO_NAO_ENCONTRADO: "usuario_nao_encontrado",

  // 409 — conflito com o estado que já existe.
  JA_EM_USO: "ja_em_uso",
  SEM_FONTE: "sem_fonte",

  // 413/415 — o arquivo enviado.
  ARQUIVO_GRANDE_DEMAIS: "arquivo_grande_demais",
  TIPO_DE_ARQUIVO_INVALIDO: "tipo_de_arquivo_invalido",

  // 422 — o pedido faz sentido, o conteúdo não passa na regra.
  CAPITULO_INVALIDO: "capitulo_invalido",
  AVALIACAO_INVALIDA: "avaliacao_invalida",
  URL_INVALIDA: "url_invalida",
  URL_DE_CAPITULO_INVALIDA: "url_de_capitulo_invalida",
  TEMPLATE_INVALIDO: "template_invalido",
  ORDEM_INVALIDA: "ordem_invalida",
  COMENTARIO_TAMANHO_INVALIDO: "comentario_tamanho_invalido",
  PROPRIO_PERFIL: "proprio_perfil",

  // 429 — bateu no limitador.
  LIMITE_EXCEDIDO: "limite_excedido",

  // 500/503 — falha nossa, ou de quem depende de nós.
  FALHA_INTERNA: "falha_interna",
  CATALOGO_INDISPONIVEL: "catalogo_indisponivel",
} as const;

export type CodigoDeErro = (typeof ERRO)[keyof typeof ERRO];
