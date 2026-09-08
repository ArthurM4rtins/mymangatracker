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

  // 400, por campo — o formulario de cadastro mostra um por campo, e sao os
  // unicos codigos que o Zod escreve direto no `message` do esquema.
  USERNAME_CURTO: "username_curto",
  USERNAME_LONGO: "username_longo",
  USERNAME_CARACTERES: "username_caracteres",
  EMAIL_INVALIDO: "email_invalido",
  SENHA_CURTA: "senha_curta",
  SENHA_LONGA: "senha_longa",

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
  /**
   * Cadastro que não pôde ser concluído, sem dizer por quê (#140): e-mail já
   * cadastrado responde isto, com o MESMO status das validações, para o 409
   * não confirmar quem tem conta. Username duplicado continua nomeado — é público.
   */
  CADASTRO_NAO_CONCLUIDO: "cadastro_nao_concluido",
  /** Capítulo que não passa do progresso da estante: nada foi gravado (#172). */
  NAO_AVANCA: "nao_avanca",
  SEM_FONTE: "sem_fonte",

  // 403 — o pedido veio de outro site (#131). So nas rotas que gravam cookie.
  ORIGEM_RECUSADA: "origem_recusada",

  // 413/415 — o arquivo enviado, ou corpo que nao e JSON (#131).
  CONTEUDO_NAO_JSON: "conteudo_nao_json",
  ARQUIVO_GRANDE_DEMAIS: "arquivo_grande_demais",
  TIPO_DE_ARQUIVO_INVALIDO: "tipo_de_arquivo_invalido",

  // 422 — o pedido faz sentido, o conteúdo não passa na regra.
  CAPITULO_INVALIDO: "capitulo_invalido",
  /** A lista chegou ao teto de obras (#135). */
  LISTA_CHEIA: "lista_cheia",
  AVALIACAO_INVALIDA: "avaliacao_invalida",
  URL_INVALIDA: "url_invalida",
  URL_DE_CAPITULO_INVALIDA: "url_de_capitulo_invalida",
  TEMPLATE_INVALIDO: "template_invalido",
  ORDEM_INVALIDA: "ordem_invalida",
  COMENTARIO_TAMANHO_INVALIDO: "comentario_tamanho_invalido",
  PROPRIO_PERFIL: "proprio_perfil",
  IDIOMA_INVALIDO: "idioma_invalido",

  // 429 — bateu no limitador.
  LIMITE_EXCEDIDO: "limite_excedido",

  // 500/503 — falha nossa, ou de quem depende de nós.
  FALHA_INTERNA: "falha_interna",
  CATALOGO_INDISPONIVEL: "catalogo_indisponivel",
} as const;

export type CodigoDeErro = (typeof ERRO)[keyof typeof ERRO];
