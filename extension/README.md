# Extensão Folunio (Chrome, Manifest V3)

Registra na estante o capítulo que você está lendo, sem sair da aba. Issue #52/#91;
desenho em `Obsidian/02. Implementacoes/feature-extensao-navegador/CLAUDE.md`.

Sem bundler, sem TypeScript: HTML, CSS e JS puros, para carregar descompactada.
Fica fora de `src/` porque não é camada do app (o lint de camadas cobra que
tudo em `src/` pertença a uma) e não entra no build da Vercel.

## Carregar para testar

1. `chrome://extensions` → ativar **Modo do desenvolvedor** → **Carregar sem compactação** → esta pasta.
2. Entrar no Folunio pelo site (produção ou `http://localhost:3000`). A extensão lê o cookie de
   sessão do domínio e manda o mesmo token em `Authorization: Bearer`.
3. Abrir um capítulo em qualquer site de leitura e clicar no ícone.

## O que faz

| Passo | Como |
|---|---|
| Sessão | `chrome.cookies.get` do `folunio_sessao` em produção, depois em localhost. Sem cookie: link "Entrar". |
| Estante | `GET /api/v1/estante`, escondendo as concluídas. Filtro por nome. |
| Capítulo | Regex sobre o `document.title` da aba (a mesma de `domain/titulo-de-capitulo.ts`). Não achou = campo vazio, nunca chute. |
| Pareamento | host + slug da URL (ou host + nome do título, quando a URL é opaca) → `entradaId`, em `chrome.storage.local`. Pré-seleciona a obra no próximo capítulo. |
| Badge | O service worker observa as abas e acende `●` quando a página é de obra pareada. Observar sempre, gravar só no clique. |
| Registro | `POST /api/v1/leitura` com `entradaId`, `capitulo` e a URL real da aba. Quem decide se o progresso avança é o servidor. |

## Idioma

Inglês e português, com `en` como padrão (`default_locale` no manifest). O idioma
vem do **navegador**, não do cookie do site: a extensão é do navegador de quem
instalou, e o Chrome resolve o fallback sozinho quando não tem o idioma pedido.

```
_locales/en/messages.json      # padrão — precisa ter TODA chave usada
_locales/pt_BR/messages.json   # underscore é regra do Chrome, não é typo
i18n.js                        # preenche o popup e traduz código de erro
```

`__MSG_x__` só é substituído em `manifest.json` e em CSS, nunca no HTML. Então o
popup marca o que traduzir com `data-i18n` (texto) e `data-i18n-placeholder`
(placeholder de campo), e `i18n.js` preenche antes de qualquer coisa aparecer.

Mensagem de erro vem da API como **código**, nunca como frase (fase 3 da #116):
`{ erros: { _geral: "capitulo_invalido" } }`. O `FRASE_DO_ERRO` do `i18n.js`
escolhe a frase no idioma de quem está lendo. Código que esta versão da extensão
não conhece cai na frase genérica — nunca aparece cru.

`tests/i18n/extensao.test.ts` cobra os dois catálogos um contra o outro, cobra que
todo nome pedido pelo popup exista, e cobra que todo código mapeado exista de fato
no catálogo da API.

## Permissões

- `activeTab`, `tabs`: ler URL e título da aba (o `tabs` é o que permite o badge antes do clique).
  **O Chrome apresenta essa permissão como "Ler seu histórico de navegação"**, e é uma descrição
  honesta: o `background.js` recebe URL e título de toda aba a cada navegação. A concessão
  corresponde ao recurso — o badge precisa disso, e não há forma mais estreita —, mas quem instala
  merece ler isso aqui e não descobrir no diálogo do navegador (#148, item 10).
- `cookies` + `host_permissions` do nosso domínio: ler a sessão.
- `storage`: o pareamento.

A extensão não injeta script nem lê DOM de site nenhum.

## Pendências

- Ícones (`action.default_icon`): hoje o Chrome mostra o ícone padrão.
- Publicação na Chrome Web Store (token de pareamento em vez do cookie antes disso).
- Adicionar obra que não está na estante: issue própria, fora do MVP.
- Mais sites no teste de formato de título (testados: MangaFire, MangaDex).
