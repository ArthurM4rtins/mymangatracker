# Extensão de navegador — Fase 6

Issue #52 · branch `feature/extensao-navegador` · desenho fechado em 04/09/2026.

## Objetivo

Registrar o capítulo que o usuário está lendo sem ele sair da aba: clique no ícone da
extensão → popup → leitura gravada. Resolve o caso das fontes sem template, onde hoje o
capítulo só entra editando a estante à mão.

## Escopo

Dentro:

- popup MV3: select da estante (filtro por nome) + campo do capítulo + botão registrar;
- autenticação reaproveitando a sessão do site, via `chrome.cookies`;
- rota nova `POST /api/v1/leitura`, que aceita a URL real da aba;
- pareamento host+slug → obra, persistido como `ReadingSource`;
- extratores de capítulo por escada (ver Decisões, item 5).

Fora:

- publicação na Chrome Web Store (carregar sem compactação basta pra testar);
- content script permanente ou detecção em background — nada roda sem clique do usuário;
- adicionar obra à estante pelo popup: link que abre a busca do app.

## Decisões tomadas

1. **Auth por `chrome.cookies` + header.** A extensão lê o `kidoku_sessao` do nosso domínio
   e manda em header de autorização. Motivo: o cookie é `sameSite: "lax"`
   (`src/app/api/v1/_shared/sessao.ts:25`) e o Chrome não anexa cookie lax em fetch com
   origin `chrome-extension://` — sem isso todo pedido volta 401. Mudar o cookie para
   `sameSite: "none"` foi **rejeitado**: enfraquece CSRF do app inteiro por causa da
   extensão. Token de pareamento fica para antes de publicar na Store.
2. **Rota nova `POST /api/v1/leitura`.** O `POST /api/v1/progresso` continua intocado: ele
   exige fonte com template e monta a `resolvedUrl` no servidor de propósito
   (`progresso.service.ts:1-7` — URL forjada pelo client não entra no histórico). A
   extensão manda o oposto, a URL real de site sem template, então ganha rota própria em
   vez de afrouxar o contrato existente.
3. **Permissões mínimas.** `activeTab` (concedida só no clique do ícone) em vez de
   `<all_urls>`; `host_permissions` apenas do nosso domínio; `cookies` para a auth. Isso
   derruba o aviso agressivo que o esboço original temia.
4. **Tela única.** Os extratores não trocam de tela: só pré-preenchem obra e capítulo. Site
   conhecido vira um clique; site novo, um clique e um número digitado. Sem ramo de UI
   separado para o caso de falha.
5. **Escada de extração do capítulo**, nesta ordem: (1) `document.title` da aba, lido via
   `activeTab`; (2) padrão de URL por host, onde existir; (3) API oficial por id — MangaDex,
   ver issue #53; (4) usuário digita. A ordem foi **invertida** depois do teste de 04/09
   (ver Achados): o título é o extrator mais barato e mais estável, não o fallback.
6. **Sem schema novo.** `ReadingProgress.resolvedUrl` guarda a URL real da aba;
   `ReadingSource` guarda o pareamento host+slug.
7. **Registrar leitura promove o status.** `PLANNED`, `PAUSED` e `DROPPED` viram `READING`;
   `COMPLETED` não é desmarcada. A regra vale nos DOIS caminhos — a extensão e o clique no
   site —, porque aplicar só no caminho novo criaria divergência de comportamento pior que o
   problema. A incoerência já existia no site antes da extensão. O select do popup não lista
   obras concluídas.
8. **Permissão `tabs`: observar sempre, gravar só no clique.** Vigiar e escrever são coisas
   separadas. A extensão acompanha as abas para reconhecer a obra pareada e acender o badge
   antes do clique; o registro continua acontecendo só quando o usuário clica. Custo: o aviso
   de "ler seu histórico de navegação" na instalação.
9. **Um clique por sessão de leitura, não por capítulo.** Progresso é o MAIOR capítulo aberto,
   então quem leu do 3 ao 10 clica uma vez no 10 e a estante vai a 10. O que se perde é
   granularidade do histórico: os capítulos pulados nunca existiram para a tela de histórico.
10. **Sem auto-registro enquanto não houver como desfazer.** Progresso é o maior capítulo e
   não existe rota que apague uma abertura: extração errada para cima gruda para sempre.
   Erro para baixo é inofensivo. Por isso badge chamando + um clique confirmando, e registro
   cego só depois que existir o desfazer.

## Achados do teste em navegador (04/09/2026)

Testado com o capítulo 2 de Vagabond nos dois sites que pareciam impossíveis.

| Site | URL | `document.title` |
|---|---|---|
| MangaFire | `mangafire.to/title/4mx-vagabondd/chapter/4745884` — **não redireciona**, nenhum número de capítulo | `Vagabond - Chapter 2` |
| MangaDex | `mangadex.org/chapter/<uuid>` — uuid opaco | `1 \| Chapter 2 - Vagabond - MangaDex` |

Conclusões:

- Os dois entregam **obra e capítulo no título da aba**. A URL, nos dois, é inútil.
- Uma regex genérica `/chapter\s*([\d.]+)/i` sobre o título resolve os dois **sem adaptador
  por host**. O MVP não precisa de adaptador nenhum nem da API do MangaDex para começar.
- Ler o título exige só `activeTab`: nada de injetar script, ler DOM ou manter seletor.
  Título é superfície de SEO do site, muda bem menos que markup interno.
- Os dois são SPA: logo após a navegação o título ainda era só o host, e só depois virou o
  título real. Como a extensão lê no clique do usuário, na prática não incomoda — mas título
  sem capítulo reconhecível é "não sei", campo vazio, nunca chute.

## Regras específicas

- Extensão é front alternativo, com **zero** regra de negócio: quem decide se o progresso
  avança continua sendo o domínio/serviço.
- `ReadingProgress` e `ReadingSource` são privados do dono — toda chamada carrega sessão.
- O popup nunca grava capítulo que não esteja visível na tela para o usuário conferir.
- Extração que falhou deixa o campo **vazio**. Nunca chuta em silêncio.
- Bloqueio de bot não é risco aqui: a leitura do DOM acontece na aba já renderizada do
  usuário, não em requisição de servidor. O risco real é o site mudar o HTML e o seletor
  quebrar — por isso o passo 4 nunca sai do fluxo.

## Pendências

- [x] ~~Confirmar a URL de leitura real do MangaFire.~~ Não redireciona; resolvido pelo título
      (ver Achados).
- [ ] Levantar o formato do título em mais sites antes de decidir se a regex genérica basta
      ou se algum host precisa de regex própria.
- [ ] Definir o formato do header de autorização e como `usuarioDaSessao()` passa a aceitá-lo
      sem afrouxar o caminho do cookie.
- [ ] Onde a extensão mora no repo (`extension/` na raiz?) e como o `eslint-plugin-boundaries`
      enxerga essa pasta.
- [ ] Fixar o ID da extensão (`key` no manifest) se a API for validar a origem.
- [ ] Lista final de sites do teste manual.
- [ ] Domínio do app em produção, para o `host_permissions` (em dev é `http://localhost:3000/*`).
- [ ] Confirmar se `POST /api/v1/estante` devolve o `entradaId` — a issue de adicionar obra
      nova pela extensão vai precisar dele para registrar o capítulo logo em seguida.

## Fora do escopo, com issue própria

**Adicionar obra que não está na estante.** O usuário começou uma obra nova num site e quer
cadastrar dali mesmo. Falta: extrair o NOME da obra do título (mais bagunçado que o número),
uma rota de busca no catálogo — nenhuma existe hoje, `buscarNoCatalogo` só é chamado por
server component — e a tela de escolha no popup. O casamento nome→`anilistId` é ambíguo
(romanização, título de fã, outro idioma), então a extensão pré-preenche a busca e QUEM
escolhe é o usuário: casar errado em silêncio suja a estante e manda progresso para a obra
errada. Fica para depois do MVP rodar de ponta a ponta.

## Referências

- Esboço anterior: `../feature-progresso-leitura/esboco-extensao-fase-6.md`
- Issues: #52 (esta), #53 (fonte MangaDex por API oficial)
- Código tocado: `src/app/api/v1/_shared/sessao.ts`, `src/app/api/v1/progresso/route.ts`,
  `src/server/services/progresso.service.ts`, `prisma/schema.prisma` (ReadingProgress/ReadingSource)
