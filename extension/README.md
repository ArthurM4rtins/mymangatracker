# Extensão Kidoku (Chrome, Manifest V3)

Registra na estante o capítulo que você está lendo, sem sair da aba. Issue #52/#91;
desenho em `Obsidian/02. Implementacoes/feature-extensao-navegador/CLAUDE.md`.

Sem bundler, sem TypeScript: HTML, CSS e JS puros, para carregar descompactada.
Fica fora de `src/` porque não é camada do app (o lint de camadas cobra que
tudo em `src/` pertença a uma) e não entra no build da Vercel.

## Carregar para testar

1. `chrome://extensions` → ativar **Modo do desenvolvedor** → **Carregar sem compactação** → esta pasta.
2. Entrar no Kidoku pelo site (produção ou `http://localhost:3000`). A extensão lê o cookie de
   sessão do domínio e manda o mesmo token em `Authorization: Bearer`.
3. Abrir um capítulo em qualquer site de leitura e clicar no ícone.

## O que faz

| Passo | Como |
|---|---|
| Sessão | `chrome.cookies.get` do `kidoku_sessao` em produção, depois em localhost. Sem cookie: link "Entrar". |
| Estante | `GET /api/v1/estante`, escondendo as concluídas. Filtro por nome. |
| Capítulo | Regex sobre o `document.title` da aba (a mesma de `domain/titulo-de-capitulo.ts`). Não achou = campo vazio, nunca chute. |
| Pareamento | host + slug da URL (ou host + nome do título, quando a URL é opaca) → `entradaId`, em `chrome.storage.local`. Pré-seleciona a obra no próximo capítulo. |
| Badge | O service worker observa as abas e acende `●` quando a página é de obra pareada. Observar sempre, gravar só no clique. |
| Registro | `POST /api/v1/leitura` com `entradaId`, `capitulo` e a URL real da aba. Quem decide se o progresso avança é o servidor. |

## Permissões

- `activeTab`, `tabs`: ler URL e título da aba (o `tabs` é o que permite o badge antes do clique).
- `cookies` + `host_permissions` do nosso domínio: ler a sessão.
- `storage`: o pareamento.

Nenhuma permissão em sites de terceiros: a extensão não injeta script nem lê DOM.

## Pendências

- Ícones (`action.default_icon`): hoje o Chrome mostra o ícone padrão.
- Publicação na Chrome Web Store (token de pareamento em vez do cookie antes disso).
- Adicionar obra que não está na estante: issue própria, fora do MVP.
- Mais sites no teste de formato de título (testados: MangaFire, MangaDex).
