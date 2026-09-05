# Handoff — Fase 1: esqueleto no ar

Escrito em 27/08/2026, sessão interrompida pela rede da escola (ver **Bloqueio**).
Ler este arquivo inteiro antes de tocar em qualquer coisa.

## Onde paramos

Repo criado em `C:\Users\arthu\source\repos\mymangatracker`, com `git init` (branch `main`),
**zero commits**. Só existe a árvore de pastas e os arquivos de documentação.
Nenhuma dependência instalada — o `create-next-app` **não rodou**.

Estado real:

```
mymangatracker/
├─ .claude/skills/mymangatracker-frontend/   (vazia)
├─ .github/workflows/                        (vazia)
├─ Obsidian/                                 (estrutura de pastas, sem conteúdo)
├─ prisma/                                   (vazia)
├─ tasks/todo.md                             ← este arquivo
└─ tests/                                    (vazia)
```

Apresentação aprovada com o professor está no artifact:
https://claude.ai/code/artifact/10425b3e-b3fd-4013-a3a5-fa18e220e58a

## Bloqueio que parou a sessão

Na Wi-Fi da escola, `registry.npmjs.org` não responde: `npm ping`, `pnpm dlx` e
`Invoke-WebRequest` todos dão ECONNRESET/timeout. `github.com` responde 200 normalmente.

Diagnóstico coletado:

| Checagem | Resultado |
|---|---|
| `Resolve-DnsName registry.npmjs.org` | devolveu **só registros AAAA** (IPv6) |
| `Test-NetConnection registry.npmjs.org -Port 443` | `TcpTestSucceeded=True`, via IPv4 `104.16.7.34` |
| `Invoke-WebRequest https://github.com` | 200 OK |
| `npm ping` | timeout |

Hipótese: Node prefere o IPv6 devolvido pelo DNS e o IPv6 dessa rede não completa handshake.

**Correção proposta — NÃO TESTADA** (a sessão foi interrompida antes de rodar):

```bash
export NODE_OPTIONS="--dns-result-order=ipv4first"
npm ping
```

Em casa isso provavelmente nem é necessário. Testar `npm ping` primeiro; se responder, seguir sem
o `NODE_OPTIONS`. Se em casa também falhar, aí sim aplicar a variável e confirmar que resolveu
antes de investigar qualquer outra coisa.

## Próximos passos, em ordem

### 1. Scaffold (precisa de rede)

```bash
cd /c/Users/arthu/source/repos/mymangatracker
pnpm dlx create-next-app@latest . --ts --tailwind --eslint --app --src-dir \
  --use-pnpm --no-turbopack --import-alias "@/*" --yes
```

Deixar o `create-next-app` resolver as versões — não fixar Next/React na mão.
As pastas `Obsidian/`, `tasks/`, `prisma/`, `tests/`, `.claude/`, `.github/` e `.git/`
não conflitam com ele.

### 2. Dependências do projeto

```bash
pnpm add @prisma/client zod jose
pnpm add -D prisma vitest eslint-plugin-boundaries
```

`jose` para o JWT de sessão. Hash de senha usa `scrypt` do `node:crypto` — **não** adicionar
argon2/bcrypt nativo, que quebra o build da Vercel.

### 3. Prisma

`prisma/schema.prisma` com o modelo do painel 06 do artifact. Entidades da Fase 1:
`User`, `Media`, `ShelfEntry`, `ReadingSource`, `ReadingProgress`.
`Entry`, `List`, `ListItem`, `Follow`, `MediaRequest` podem entrar no mesmo schema já,
mas as telas delas são Fase 4/5.

Não esquecer:
- `@@unique([userId, mediaId])` em `ShelfEntry`
- `@@index([userId, mediaId, openedAt(sort: Desc)])` em `ReadingProgress`
- índice único **parcial** em `ReadingSource`: uma linha ativa por `(userId, mediaId)`.
  Prisma não gera índice parcial — escrever à mão numa migration:
  `CREATE UNIQUE INDEX ... ON "ReadingSource"("userId","mediaId") WHERE "isActive";`

### 4. Camadas + lint que as cobra

Criar `src/server/{domain,services,repositories,infra}` e configurar
`eslint-plugin-boundaries` com as regras do painel 04 do artifact. Isso é requisito
avaliado — sem ele o "arquitetura em camadas" vira só nome de pasta.

Confirmar que funciona: escrever um import proibido de propósito (`@prisma/client`
num componente de tela), rodar `pnpm lint`, ver quebrar, desfazer.

### 5. TDD — teste antes da implementação

Ordem obrigatória, ver **TDD-first** no `CLAUDE.md` da raiz.
Os dois primeiros testes, nesta ordem:

1. `tests/domain/url-template.test.ts` — derivação do template.
   Caso real medido no site em 27/08: série é `/manga/<Slug>`, capítulo é
   `/title/<Slug>/chapter/<n>/<pagina>` (ex.: `/title/Lookism/chapter/57/1`).
   O caso difícil é o link do capítulo 1 — `/title/Lookism/chapter/1/1` tem **dois**
   segmentos com valor `1`. O algoritmo tem que ranquear o que vem logo depois de
   `chapter`/`cap`/`ch` e devolver os candidatos para o usuário confirmar.
2. `tests/repositories/reading-progress.privacy.test.ts` — o teste do painel 06.
   Progresso de um usuário nunca volta na consulta de outro.

### 6. Vertical slice mínimo para "estar no ar"

- `/` — status do sistema (app, banco, AniList). Funciona **sem banco**, mostrando o que falta.
- `/catalogo` — busca no AniList. Funciona **sem banco**. É o que garante que o link entregue
  ao professor mostra algo real mesmo antes do Postgres estar ligado.
- `/entrar`, `/cadastrar`, `/estante` — precisam de banco.
- `GET /api/v1/health` — reporta status de cada dependência.

**O build não pode depender do banco.** `next build` roda sem `DATABASE_URL`; rodar
`prisma migrate deploy` só quando a variável existir, por script:

```json
"build": "prisma generate && node scripts/migrate-if-configured.mjs && next build"
```

Página que lê banco vai como dinâmica, e degrada com aviso de configuração pendente
em vez de estourar.

### 7. GitHub (dá para fazer sem browser)

`gh` já está autenticado como `ArthurM4rtins` com escopo `repo` e `workflow`.

```bash
gh repo create mymangatracker --public --source=. --remote=origin --push
```

Antes: commits atômicos por unidade lógica, ver **Git** no `CLAUDE.md`.

### 8. Vercel + Neon — PRECISA DO USUÁRIO

Estes dois passos abrem browser e não dá para fazer pela sessão:

1. `vercel.com/new` → importar o repo → deploy. O primeiro build passa sem banco.
2. Na aba **Storage** do projeto → criar **Neon Postgres** → conectar ao projeto.
   A Vercel injeta `DATABASE_URL` sozinha nas variáveis — **não** copiar e colar a string
   de conexão em lugar nenhum, nem no chat.
3. Redeploy. Aí a migration roda e o app conversa com o banco.

Alternativa por CLI, se preferir: o usuário roda `! npx vercel login` na própria sessão
(abre browser uma vez); depois disso `vercel link`, `vercel env` e `vercel deploy` funcionam
pela sessão normalmente. O banco continua sendo criado pelo dashboard.

## Sessao 27/08 — continuacao (boilerplate)

Repo: https://github.com/ArthurM4rtins/mymangatracker (publico, default `main`).
Issue do boilerplate: #1. PR aberto: #2 (`feature/boilerplate` -> `main`).

Rede voltou: `npm ping` deu `PONG 321ms` sem `NODE_OPTIONS`. Passos 1, 2 e 4 do plano feitos.

Desvios do que estava escrito aqui, e o porque:

| Plano original | O que foi feito | Motivo |
|---|---|---|
| `create-next-app .` direto no repo | scaffold em pasta temporaria, arquivos copiados | as pastas existentes conflitam com a whitelist do `create-next-app` (ver `lessons.md`) |
| — | `prisma` fixado em `7.10.0` | `prisma@latest` estava em `8.0.0-rc.12` e o `@prisma/client@latest` em `7.10.0`: majors diferentes |
| `src/app/(ui)` | `layout.tsx`, `page.tsx`, `globals.css` e `favicon.ico` movidos para la | route group `(ui)` serve de root layout; a camada de apresentacao passa a existir de fato |
| — | `.agents/`, `.windsurf/` e `skills-lock.json` removidos | side effect do `prisma init`, ver `lessons.md` |

Versoes fechadas pelo scaffold: Next 16.3.3, React 19.2.8, Tailwind 4, ESLint 9,
Prisma 7.10.0, Vitest 4.1.11.

Provas rodadas nesta sessao:

- `pnpm lint` com import proibido de proposito (`ui` -> `repository`, `@prisma/client` na tela,
  `next/headers` no servico): 3 erros, um por regra. Probes apagados, `pnpm lint` volta a exit 0.
- `pnpm build` sem `DATABASE_URL`: exit 0, migration pulada pelo `scripts/migrate-if-configured.mjs`.
  **Revalidar depois que o `schema.prisma` tiver modelos** — hoje o schema esta vazio.
- `pnpm test`: vitest sobe e roda (checado com teste descartavel, ja removido).

Pendente de decisao antes de seguir: estrategia de commit (o `CLAUDE.md` proibe commit direto na
`main` e o repo tem zero commits) e a issue correspondente, que depende do repo existir no GitHub.

## Checklist da Fase 1

- [x] `npm ping` responde
- [x] scaffold do Next rodou
- [x] dependências instaladas
- [x] `schema.prisma` escrito, com o índice parcial na migration
- [x] `eslint-plugin-boundaries` configurado e **comprovado quebrando**
- [x] teste da derivação de template passa
- [x] teste de privacidade do progresso passa
- [x] `pnpm build` verde **sem** `DATABASE_URL`
- [x] repo público no GitHub
- [x] deploy na Vercel respondendo
- [x] Neon conectado, migration aplicada, `/api/v1/health` reportando banco OK
- [x] links do repo e do ar atualizados no artifact (painel do cabeçalho e checklist do painel 09)

## Decisões já fechadas — não reabrir

| Decisão | Valor |
|---|---|
| Nome | `mymangatracker` |
| Formato | Next.js único (App Router), **não** Vite + NestJS separados |
| Motivo | um link no ar, sem API dormindo na hora da apresentação |
| ORM | Prisma |
| Banco | PostgreSQL — Neon em produção, Docker Compose no dev |
| Catálogo | AniList GraphQL, server-side, cacheado em `Media` |
| Senha | `scrypt` do `node:crypto` |
| Sessão | cookie httpOnly + JWT via `jose` |
| Extensão de navegador | Fase 6, **não** MVP |
| Tabela `Chapter` | não entra — sem fonte de dados |
| Integrantes | Arthur Juchem Martins, Nicholas Gabriel Deotti Schlindwein |

## Regra de produto que não pode ser perdida

`ReadingSource` e `ReadingProgress` são **privados do dono**. Nunca aparecem para outro
usuário, nunca entram em contagem ou ranking público. Toda consulta carrega `userId`.
Isso é invariante do sistema, não preferência do usuário — o motivo está no painel 01
do artifact.

## Sessao 31/08 — identidade visual + auth (issues #7, #8, #9)

Maquina nova (Nicholas). pnpm instalado via `npm i -g pnpm@9.15.0` (corepack pede admin).
**Sem Docker e sem `.env` aqui** — `pnpm test:db` nao rodou nesta sessao; o teste novo
`tests/repositories/usuario.privacy.test.ts` roda quando houver Postgres.

Nada commitado ainda — o usuario pediu para segurar o git. Trabalho pronto para virar
commits atomicos em `feature/identidade-visual` e `feature/auth`.

Feito:

- Identidade Kidoku: nome, logo double-check, 3 temas (sumi/noturno/matcha) com seletor
  segmentado, fontes Zen Kaku Gothic New + Instrument Sans. Ver
  `Obsidian/02. Implementacoes/identidade-visual/CLAUDE.md` e licao nova em `lessons.md`
  (nao ecoar estetica do Letterboxd).
- #7 cadastro: domain/senha (scrypt, formato autodescritivo), usuario.repository (leitura
  nunca devolve hash), cadastro.service, POST /api/v1/usuarios, tela /cadastrar.
- #8 login: infra/sessao (jose, HS256, so sub no payload), sessao.service (hash fantasma
  contra timing de e-mail inexistente), POST /api/v1/sessao, tela /entrar.
- #9 logout: DELETE /api/v1/sessao, BotaoSair, usuarioDaSessao() em api/v1/_shared.
- Boundaries: liberado `node:*` e novo elemento `sessao` — ambos provados quebrando.

Provas: pnpm lint 0, pnpm test 69/69, pnpm build verde. Issues #7-#9 NAO fechadas no
GitHub (dependem de test:db + commit).

Proximo: #10 (adicionar a estante) + redesign do /catalogo junto, depois #11.

## Sessao 31/08 — continuacao: issue #10 + redesign do catalogo

- #10 feita em TDD: domain/media-cache (TTL 24h, sonda vista falhando),
  estante.service (cache fresco nao chama AniList; obra descartada nao vira linha),
  media.repository e shelf.repository (upserts), infra buscarMediaPorId (via Page.media,
  id inexistente = null e nao erro), POST /api/v1/estante (401 sem sessao),
  botao-estante no catalogo redesenhado (grade 2 col, capas, badges).
- Provas: 78 testes unitarios, lint 0, build verde. No browser: + Estante sem sessao
  redireciona para /entrar.
- tests/repositories/estante.upsert.test.ts escrito, aguardando Postgres.
- Issue #10 NAO fechada (test:db + commit pendentes).

Proximo: #11 — tela /estante e mudanca de status.

## Sessao 01/09 — banco local, catalogo live (#17, #18) e commits

Maquina do Nicholas, sem Docker. Postgres nativo 17.2 na 5432: criados role
`mymangatracker` e bancos `mymangatracker`/`mymangatracker_test`, migration
`entidades_fase_1` aplicada. `.env` criado do exemplo com SESSION_SECRET gerado.

- `pnpm test:db` rodou pela primeira vez: achou bug real — Prisma 7 com driver
  adapter nao poe `meta.target` no P2002; o indice vem em
  `meta.driverAdapterError.cause.constraint.index`. Traducao corrigida no
  usuario.repository (username duplicado caia no ramo email). 20/20 verdes.
- #17: busca ao digitar (debounce 400ms, ?q= na URL) + campo vazio mostra
  populares do AniList (estado novo `destaques` no catalogo.service, TDD).
- #18: Sair a direita do seletor de tema. Seletor migra para o dropdown de
  navegacao quando ele existir.
- Backlog inteiro virou commits atomicos em `feature/fase-2` (1 PR).

Proximo: #11 — tela /estante e mudanca de status; depois dropdown de navegacao.

## Sessao 01/09 — continuacao: issue #11

- #11 em TDD: repositorio (listar com userId obrigatorio + updateMany com userId
  no where, protecao vista falhando), servico (listar/mudarStatus), GET e PATCH
  em /api/v1/estante, tela /estante com abas por ?status= e select inline.
  Link Estante no header para logado.
- Smoke E2E via HTTP: cadastro 201, login 200, add 200, lista 200, PATCH 200,
  tela renderiza Berserk como Lendo. Sem sessao: API 401, tela 307 -> /entrar.
- Provas: lint 0, 90 testes unitarios, 26 test:db, build verde COM e SEM
  DATABASE_URL. Branch feature/estante-tela (empilhada na feature/fase-2),
  PR aguardando o merge do #19.
- Usuario de smoke `smoketest`/`smoke@teste.local` ficou no banco local dev.

Proximo: dropdown de navegacao no header (perfil, catalogo, temas) ou Fase 2
do progresso de leitura (ReadingSource/ReadingProgress).

## Sessao 01/09 — continuacao: dropdown de navegacao (#21)

- Menu unico no header (`componentes/menu-navegacao.tsx`): Catalogo, Estante
  (logado), seletor de tema dentro do menu, Entrar/Sair. Esc/clique fora fecha.
- Branch feature/menu-navegacao, empilhada na feature/estante-tela.
- Abrir/fechar nao foi testado em browser (extensao desconectada) — conferir
  a mao antes do merge.
- Perfil entra no menu quando a tela de perfil existir.

Proximo: Fase 2 — progresso de leitura (ReadingSource/ReadingProgress).

## Sessao 01/09 — continuacao: Fase 2, progresso de leitura (#23)

Desenho aprovado em Obsidian/02. Implementacoes/feature-progresso-leitura/
(CLAUDE.md da tarefa + esboco-extensao-fase-6.md com a conversa sobre a
extensao de navegador). Branch feature/progresso-leitura, empilhada no menu.

- Dominio `progresso`: proximoCapitulo (floor+1), progrideEstante (maior
  manda, releitura nao regride), urlDaLeitura sobre o aplicarTemplate da Fase 1.
- Repositorios: reading-source (trocarFonteAtiva em transacao, uma ativa,
  historico fica) e registrarAberturaComProgresso (historico + progressChapter
  da estante na MESMA transacao). ATENCAO: reading-progress.repository ja
  existia da Fase 1 (registrarAbertura/ultimaAbertura/maiorCapitulo) — foi
  preservado, so ganhou a variante transacional.
- Servicos: fonte (candidatos com exemplo do cap 2, confirmacao valida
  template) e progresso (URL resolvida server-side, client so manda numero).
  DTO da estante compoe fonte + proximoCapitulo, sem vazar mediaId.
- Rotas: POST /api/v1/fontes/candidatos, /api/v1/fontes, /api/v1/progresso.
- Tela: Configurar leitura / Trocar fonte + Continuar cap. N na estante.
- Provas: lint 0, 113 unitarios, 31 test:db, build verde. E2E: derivar ->
  confirmar -> abrir 1 -> abrir 57.5 -> releitura 3 nao regrediu (57.5),
  proximo 58 na tela.

Proximo: front/disposicao geral (pedido do usuario) apos merges; depois
avaliacao/rating na estante ou pagina da obra.

## Sessao 01/09 — continuacao: home leitura primeiro (#25)

Conceito escolhido pelo usuario entre 3 mockups: "leitura primeiro".
Regra de lessons.md respeitada: Letterboxd e benchmark de produto, nao estetica.

- Logado: "Boa leitura, <username>" + fila Continuar lendo (READING com fonte,
  botao compacto). Deslogado: proposta + Criar conta/Entrar.
- Populares do AniList como grade de capas linkando o catalogo (todos).
- Status do sistema: linha no rodape; aviso no topo so quando degradado/fora.
- usuario.service novo (perfil publico, TDD); ContinuarLeitura ganhou `compacto`.
- Provas: lint 0, 115 unitarios, build verde, smoke logado/deslogado.
- Branch feature/home-leitura, empilhada na progresso-leitura.

Cadeia de PRs: #19 <- #20 <- #22 <- #24 <- #26(home). Mergear em ordem.
Proximo: continuar o front (catalogo/estante) ou rating.

## Sessao 01/09 — continuacao: front do catalogo (#27)

- Obra ja na estante nasce marcada no catalogo (logado): repo
  listarAnilistIdsDaEstante (privacidade provada com 2 usuarios no test:db),
  servico anilistIdsNaEstante (TDD), BotaoEstante com estado inicial do server.
- Card refinado: capa maior, titulo 2 linhas, descricao 3, hover no acento.
- Licao nova em lessons.md: here-string PS 5.1 + aspas duplas internas quebra
  argumento de exe nativo — usar --body-file / commit -F.
- Branch feature/catalogo-front, empilhada na home-leitura. PR #28.

Cadeia: #19 <- #20 <- #22 <- #24 <- #26 <- #28. Mergear em ordem.
Proximo: front da estante (refino visual) ou rating/avaliacao.

## Sessao 01/09 — continuacao: fonte sem template (#29)

Problema levantado pelo usuario: MangaFire/MangaDex nao carregam o numero do
capitulo na URL (id opaco/uuid) — derivacao de template falha. Decisao
(opcao 1, registrada no CLAUDE.md da feature-progresso-leitura): fonte pode
ser a PAGINA DA OBRA; botao vira abrir obra + registrar cap. N.

- Dominio: tipoDaFonte (discrimina pela presenca de {chapter}) e urlDaPagina.
  Sem migration — o proprio urlTemplate carrega o tipo.
- candidatosDeFonte sempre devolve paginaDaObra; confirmar aceita path sem
  marcador; abrirCapitulo abre a pagina e registra igual. DTO da estante ganha
  fonte.tipo. Template com offset (id sequencial) descartado: cap .5 e
  re-upload quebram a aritmetica.
- Tela: sem candidato o erro virou oferta de salvar a pagina, com dica de
  colar a URL da serie. Bug pego no smoke: controller nao repassava
  paginaDaObra.
- Provas: lint 0, 123 unitarios, build verde. E2E: URL real do MangaFire ->
  0 candidatos -> salva pagina -> abrir devolve a URL da obra e registra 58.
- Branch feature/fonte-sem-template, empilhada na catalogo-front. PR #30.

Cadeia: #19 <- #20 <- #22 <- #24 <- #26 <- #28 <- #30. Mergear em ordem.

## Sessao 01/09 — continuacao: capitulo editavel e fonte-pagina honesta (#31)

Correcao do usuario: fonte de pagina prometia registrar cap. N mas abria a
pagina salva (licao nova em lessons.md — botao nao promete o que nao controla).

- Capitulo em leitura editavel na estante (inclusive para tras — edicao e
  correcao do dono; regra do maior capitulo vale para ABERTURAS). Repo
  atualizarProgressoDaEntrada + servico definirProgresso (TDD) + PATCH
  /api/v1/estante/:id aceita { capitulo } alem de { status }.
- Fonte de pagina virou link direto "Abrir a obra" (sem POST, sem registro
  automatico); DTO da fonte expoe urlDaObra. Template continua com o
  Continuar cap. N automatico.
- Extensao (Fase 6): decidido — clique na pagina do capitulo registra o cap e
  o abrir passa a usar a ultima URL registrada. No esboco do vault.
- Provas: lint 0, 127 unitarios, 33 test:db, build verde. E2E: PATCH capitulo
  12.5 regrediu o progresso, tela mostra campo editavel + Abrir a obra.
- Branch feature/editar-progresso, empilhada na fonte-sem-template. PR #32.

Cadeia: #19 <- #20 <- #22 <- #24 <- #26 <- #28 <- #30 <- #32.

## Sessao 01/09 — continuacao: avaliacao nota + resenha (#33)

Desenho aprovado (Obsidian/02. Implementacoes/feature-avaliacao/): UMA
avaliacao por (userId, mediaId), nota 0,5-5,0 em meia estrela, nota e resenha
independentes (vazia nao existe), spoiler flag, visivel so ao dono ate a fase
social.

- Entidade Entry por migration aditiva (--create-only) com DOIS CHECKs a mao:
  meia estrela e nao-vazia — ambos provados quebrando com INSERT invalido.
  ATENCAO: depois de migration nova, rodar pnpm prisma generate (o client
  velho nao tem o model e o teste morre com undefined.upsert).
- Dominio rating.ts (TDD), avaliacao.repository (upsert por dono, privacidade
  provada), avaliacao.service (TDD, 8 testes), POST/DELETE /api/v1/avaliacoes,
  DTO da estante ganha avaliacao, componente Avaliar com estrelas de duas
  metades clicaveis e resenha com spoiler escondido por padrao.
- Provas: lint 0, 140 unitarios, 37 test:db, build verde. E2E: salvar 4.5 com
  spoiler -> 200; 3.7 -> 422; tela mostra estrelas e o botao de mostrar
  spoiler.
- Branch feature/avaliacao, empilhada na editar-progresso. PR #34.

Cadeia: #19 <- #20 <- #22 <- #24 <- #26 <- #28 <- #30 <- #32 <- #34.
Proximo: pagina da obra (junta busca+avaliacao+fonte) ou fase social.

## Sessao 01/09 — continuacao: pagina da obra (#35), bloco A do roadmap

Roadmap aprovado pelo usuario: A pagina da obra -> C filtros do catalogo ->
B reviews sociais (PUBLICAS, confirmado) -> D lists -> E pagina do autor.
Desenho em Obsidian/02. Implementacoes/feature-pagina-obra/.

- Cache Media ganhou banner, ano, generos, nota media e autores (Json) —
  migration aditiva; linha velha reidrata pelo TTL de 24h.
- Mapper com autores do staff (papeis com Story/Art) e mapearRecomendacoes.
- Queries do AniList unificadas num fragmento; buscarSimilares novo.
- obra.service: cache fresco nao gasta cota; velho rebusca; AniList fora
  serve cache mesmo velho (pagina e leitura); similares falhando somem.
- /obra/[anilistId] com banner+capa+painel do usuario (controles da estante
  reusados) + similares. Capas de home/catalogo/estante linkam para la.
- Provas: lint 0, 153 unitarios, 37 test:db, build verde. Smoke: Vagabond com
  autor/ano/nota/similares; logado ve controles.
- PEGADINHA: primeiro hit pos-restart do dev server serviu modulo velho do
  turbopack e salvou cache sem os campos — envelhecer o syncedAt e revisitar
  corrige. Depois de migration, reiniciar o pnpm dev (client em memoria).
- Branch feature/pagina-obra, empilhada na avaliacao. PR #36.

Cadeia: ... <- #34 <- #36. Proximo do roadmap: C (filtros do catalogo).

## Sessao 01/09 — continuacao: filtros do catalogo (#37), bloco C

- Dominio catalogo-filtros: whitelist da URL (tipo, genero fixo do AniList,
  decada, ordem). Valor desconhecido descartado em silencio.
- Infra buscarFiltrado com query montada SO com args presentes — o AniList
  responde 400/500 para variavel de filtro null (provado com probe; nao usar
  variaveis opcionais nulas nunca). buscarMedia/BUSCA antigas removidas.
- Servico: vitrine de populares so sem termo E sem filtro; o resto e busca.
- UI: selects tipo/genero/decada/ordem gravando na URL + limpar filtros;
  busca ao digitar e filtros preservam-se mutuamente.
- Provas: lint 0, 159 unitarios, build verde. Smoke: manhwa+nota devolve
  The Greatest Estate Developer; Romance+1990 devolve Uzumaki (que TEM
  Romance nos generos do AniList — dado deles, filtro correto).
- Branch feature/catalogo-filtros, empilhada na pagina-obra. PR #38.

Cadeia: ... <- #36 <- #38. Proximo do roadmap: B (reviews sociais publicas).

## Sessao 01/09 — continuacao: reviews sociais (#39), bloco B

Resenha COM TEXTO agora e publica na pagina da obra — primeira consulta do
sistema sem userId no where, consciente e travada em teste: username sai,
e-mail e ids de usuario NUNCA. Progresso e fonte seguem 100% privados.

- ReviewLike (unica por entry+user, toggle) e ReviewComment (chat plano,
  CHECK de nao-vazio provado quebrando), Cascade dos dois lados.
- Ordenacao: mais curtidas, desempate recente. Nota sem texto fica fora.
- Rotas: POST reviews/:id/curtida (toggle), POST reviews/:id/comentarios,
  DELETE comentarios/:id (so o proprio). Leitura e server-side na pagina.
- UI: card de resenha com estrelas, spoiler escondido, curtida otimista,
  conversa em details com apagar so do proprio.
- Provas: lint 0, 166 unitarios, 44 test:db, build verde. E2E com 2 contas:
  leitor2 curtiu (toggle 1->0->1), comentou, pagina mostra tudo.
- Usuario de teste novo no dev: leitor2/leitor2@teste.local.
- Branch feature/reviews-sociais, empilhada na catalogo-filtros. PR #40.

Cadeia: ... <- #38 <- #40. Proximo do roadmap: D (lists) e E (pagina do
autor); front geral segue evoluindo.

## Sessao 01/09 — continuacao: lists (#41), bloco D

- List/ListItem por migration aditiva (nome nao-unico como Letterboxd, CHECK
  de nao-vazio provado quebrando; item unico por obra, ordem de insercao).
- Publicas desde o inicio (recorte do social: username, nunca e-mail/ids —
  travado em teste). Escrita so do dono, intruso provado falhando.
- Servico: nome 1-100; toggle poe/tira obra (por anilistId, obra do cache).
- Rotas: GET/POST /api/v1/listas, DELETE /:id, POST /:id/itens (toggle).
- Telas: /listas (capas empilhadas + criar inline), /listas/:id (grade,
  remover/apagar so dono), + Lista no painel da pagina da obra, menu.
- Fora do MVP (registrado no vault): editar nome/descricao, reordenar,
  curtir/comentar lista.
- Provas: lint 0, 172 unitarios, 49 test:db, build verde. E2E: smoketest
  criou "seinen essencial", pos Berserk+Vagabond, /listas mostra "por
  smoketest · 2 obras", dono ve apagar/remover, anonimo le sem controles.
- Branch feature/lists, empilhada na reviews-sociais. PR #42.

Cadeia: ... <- #40 <- #42. Resta do roadmap: E (pagina do autor).

## Sessao 01/09 — continuacao: pagina do autor (#43), bloco E — roadmap completo

- /autor/:staffId com foto, nome nativo, bio (sem HTML nem markdown de link)
  e grade de obras por popularidade. Autores na pagina da obra viram links.
- SEM tabela nova — desvio consciente do plano do bloco A: leitura ao vivo do
  AniList (como similares) responde melhor que cache proprio; autor nao e
  dado do usuario. Registrado tambem no vault da pagina-obra.
- PEGADINHA nova de API: Staff(id:) direto responde 404 com errors para id
  inexistente (indistinguivel de rate limit) — mesma solucao do POR_ID:
  consultar via Page.staff, que devolve lista vazia. Probe antes de codar.
- Provas: lint 0, 177 unitarios, build verde. Smoke: /autor/96911 (Inoue)
  com bio e Slam Dunk/Vagabond na grade; id inexistente = 404; link a partir
  da obra funciona.
- Branch feature/pagina-autor, empilhada na lists. PR #44.

ROADMAP A-E COMPLETO. Cadeia final de PRs para o Arthur mergear EM ORDEM:
#19 <- #20 <- #22 <- #24 <- #26 <- #28 <- #30 <- #32 <- #34 <- #36 <- #38
<- #40 <- #42 <- #44 (retarget de cada um apos o merge do anterior).
Proximos candidatos: perfil publico do usuario, feed de atividade, extensao
(Fase 6), refino visual continuo.

## Sessao 01/09 — continuacao: visual da obra e avaliacao livre (#45)

Feedback do usuario com prints:

- Banner com fallback: obra sem banner usa a capa esticada com blur — todas
  consistentes. Capa nao sobrepoe mais o banner (Chainsaw Man coberto).
- Dominio descricao (TDD): sinopse sem "(Source: ...)"; bloco Notes vira a
  secao "Curiosidades" em topicos com marcador.
- AVALIAR NAO EXIGE MAIS ESTANTE: avaliacao por anilistId (servico resolve
  pelo cache), rotas /api/v1/avaliacoes mudaram o contrato (anilistId no
  corpo/rota). obra.service devolve minhaAvaliacao separada do recorte.
- Na tela da obra: "Sua avaliacao" e secao propria fora do tracking —
  estrela SALVA no clique, resenha em caixa sempre aberta com salvar proprio.
  Estrelas viraram componente compartilhado (componentes/estrelas.tsx).
- Provas: lint 0, 181 unitarios, build verde. E2E: leitor2 avaliou Berserk
  sem ter na estante (200); pagina sem Source, com Curiosidades e blur.
- Branch feature/visual-obra, empilhada na pagina-autor. PR #46.

Cadeia: ... <- #44 <- #46.

## Sessao 01/09 — organizacao do board de issues

- FECHADAS 23 issues ja entregues (#7-#14, #17, #18, #21, #23, #25, #27, #29,
  #31, #33, #35, #37, #39, #41, #43, #45), cada uma comentada com o PR da
  cadeia. #21 tem nota: dropdown foi substituido pelo header inline no #46.
- ABERTA que continua: #16 (curadoria narrativa, 56/100).
- BACKLOG NOVO criado:
  - #47 mergear a cadeia de PRs #19->#46 em ordem (para o Arthur)
  - #48 nota media do Kidoku na pagina da obra (substitui a do AniList)
  - #49 perfil publico do usuario (/u/:username, abre caminho pro Follow)
  - #50 feed de atividade na home
  - #51 lists: editar, reordenar e curtir
  - #52 extensao de navegador (Fase 6, modelo do esboco no vault)
  - #53 fonte MangaDex por API oficial
  - #54 historico de leitura visivel ao dono

## Sessao 02/09 — perfil publico do usuario (#49)

- gh: a conta ativa tinha voltado para `NicholasSchlindwein`; trocada para
  `NicholasSchlindwein-dev` + `gh auth setup-git` (licao de 01/09).
- Vercel preview FALHA de #32 em diante (#30 passa). #32 nao mexe em prisma,
  package.json nem config, e lint/test/build local ficam verdes — causa esta
  na conta Vercel do Arthur (`arthurm4rtins-projects`), logs so por la.
- /u/:username SEM tabela nova: dominio perfil.ts (contagem por status com
  zeros), usuario.repository.buscarUsuarioPorUsername (sem e-mail),
  perfil.repository (groupBy da estante, count de avaliacoes, resenhas com
  texto recentes), lista.repository.listarListasDoUsuario (select do card
  compartilhado com /listas), perfil.service compoe. Invariante travada em
  teste de banco: e-mail, id, fonte, progresso e capitulo nunca saem.
- Tela: avatar com inicial, numeros (estante por status, avaliacoes,
  listas), resenhas recentes (client card por causa do estrelasTexto),
  listas. Username vira link na resenha, no comentario e no detalhe da
  lista; na listagem /listas NAO (card inteiro ja e <a>, ancora aninhada
  e invalida). Header: link Perfil quando logado.
- Provas: lint 0, 186 unitarios, 52 test:db, build verde. Smoke:
  /u/smoketest 200 com Berserk e "seinen essencial", /u/naoexiste 404.
- Branch feature/perfil-usuario, empilhada na visual-obra. PR #55.

## Sessao 02/09 — continuacao: redesign do perfil apos print do usuario

Feedback: cards de contagem feios; perfil de outro usuario deve mostrar so o
que a pessoa FEZ (nota, resenha, lista), meu perfil mostra a estante.

- Status da estante SAIU do publico (nem contagem). Perfil de outro usuario:
  numeros numa linha do header (avaliadas · resenhas · listas · curtidas
  dadas), grade de avaliadas (capa + nota) FILTRAVEL pela URL (ordem=
  recentes|antigas|maior_nota|menor_nota, nota=0.5..5 — whitelist no
  dominio, ordena em memoria), resenhas recentes, listas.
- Perfil do DONO: bloco "Minha estante" com abas por status (contagem no
  chip) e capitulo embaixo da capa — aprovado pelo usuario. Servico so monta
  quando viewerId === dono; teste de banco prova que A visto por B nao
  serializa status, capitulo, fonte, e-mail nem id.
- Componentes client: minha-estante (abas), grade-avaliadas e resenha (os
  dois por causa do estrelasTexto, que vive em modulo client),
  filtros-avaliadas (selects -> URL, padrao do catalogo).
- Provas: lint 0, 194 unitarios, 53 test:db, build verde. Smoke: usuario
  novo `provadona` (senha no historico da sessao, nao aqui) com 2 obras ve
  Minha estante + "voce"; anonimo e outro logado nao recebem READING nem
  progressChapter; ?ordem=maior_nota&nota=5 filtra.
- Pendencias no vault: grade de "resenhas que curtiu", avatar real, bio,
  Follow.

Cadeia: ... <- #46 <- #55.

## Sessao 02/09 — estudo do logo (#56) e nota media (#48)

- Estudo do nome no logo: `Obsidian/02. Implementacoes/identidade-visual/
  estudo-fonte-nome-logo.html` (abre no browser) + artifact. Cinco wordmarks
  em SVG no traco do check (A, A2 do esboco do Nicholas, B, C, D) e oito
  fontes do Google. Decisao PARADA na issue #56; branch
  feature/logo-wordmark (so o estudo, empilhada na perfil-usuario).
- #48 nota media do Kidoku: dominio nota-media (media ponderada com uma
  casa via Math.round(x*10)/10, histograma com as dez posicoes),
  avaliacao.repository.contarNotasPorValor (groupBy rating por mediaId, so
  valor+contagem), obra.service devolve notaDoKidoku (agregado fora = null,
  pagina segue). Hero: componente client nota-kidoku (SIMBOLO e client)
  com media, contagem e dez barras.
- Provas: lint 0, 200 unitarios, 55 test:db, build verde. Smoke:
  /obra/30002 mostra "Nota do Kidoku 4,8".
- Branch feature/nota-media, empilhada na perfil-usuario. PR #57.

Cadeia: ... <- #46 <- #55 <- #57.

## Sessao 02/09 — historico de leitura (#54)

- Historico entra no painel de tracking da pagina da obra (nao na estante):
  reading-progress.repository.listarAberturas(userId, mediaId, limite) com
  host da fonte via relacao (SetNull = "fonte removida"); obra.service poe
  `historico` em MinhaRelacao (limite 20, falha = []); tela em <details>
  com capitulo, data/hora e link pro host. So renderiza dentro de `minha`,
  que so existe pra quem esta logado com a obra na estante.
- PEGADINHA de smoke: POST /api/v1/fontes exige urlTemplate como CAMINHO
  relativo comecando com "/" e marcador `{chapter}` (nao `{n}`), senao 422
  "template invalido"; sem fonte, POST /progresso da 409.
- Provas: lint 0, 201 unitarios, 57 test:db, build verde. Smoke: provadona
  no Berserk ve "Historico de leitura · 2 aberturas" (3.5 e 1, exemplo.test);
  anonimo nao ve.
- Branch feature/historico-leitura, empilhada na nota-media. PR #58.

Cadeia: ... <- #55 <- #57 <- #58.

## Sessao 02/09 — feed de atividade na home (#50)

- Dominio atividade.montarFeed: intercala resenhas e listas por data (sort
  estavel, empate = resenha primeiro) e corta no limite. Servico pede 10 de
  cada, mescla, corta em 10; uma consulta fora nao derruba a outra.
- atividade.repository.listarResenhasDaComunidade (so resenha com texto,
  username + obra, sem e-mail/ids — teste de banco). ListaPublica ganhou
  `criadaEm` (SELECT_DO_CARD) pro feed ordenar; fake do perfil.service.test
  precisou do campo.
- Home: secao "Atividade recente" pra logado E visitante, componente client
  feed-da-comunidade (estrelasTexto e client), spoiler em details, username
  linka pro perfil. Sem paginacao: ultimos 10.
- Provas: lint 0, 207 unitarios, 59 test:db, build verde. Smoke: home mostra
  1 resenha (spoiler escondido) + 1 lista.
- Branch feature/feed-atividade, empilhada na historico-leitura. PR #59.

Cadeia: ... <- #57 <- #58 <- #59.

## Sessao 02/09 — lists: editar, reordenar, curtir (#51)

- Desenho aprovado antes de codar (vault feature-lists): setas em vez de
  arrastar; curtida so como numero; /listas segue por recente.
- Migration `20260902220948_list_like` (ListLike unica por lista+usuario,
  Cascade) aplicada no dev e no teste. PEGADINHA: `prisma migrate dev` do
  Prisma 7 nao regenera o client — rodar `pnpm prisma generate` depois, e
  reiniciar o `pnpm dev`. limparBanco ganhou listLike antes de list.
- Dominio lista-ordem (mesmoConjunto + mover), repositorio (editarLista,
  listarItensParaOrdem, reordenarItens em transacao, alternarCurtidaDaLista;
  ListaPublica.curtidas, ListaComItens.curtidas/curtiPorMim), servico
  (editar com a regra da criacao, reordenar validado no dominio, curtir),
  rotas PATCH /listas/:id, PUT /listas/:id/ordem, POST /listas/:id/curtida.
- Tela: editar-lista (inline), curtir-lista (otimista, anon vai pro /entrar),
  itens-ordenaveis (grade do dono com ← → e remover; nao-dono ve a grade
  server). Contagem de curtidas no card de /listas e no feed da home.
- Provas: lint 0, 218 unitarios, 64 test:db, build verde. Smoke E2E com
  provadona: PATCH com trim 200, nome vazio 422, PUT ordem 200 e faltando
  422, curtir toggle, anon 401 e sem controles na pagina.
- Branch feature/lists-evolucao, empilhada na feed-atividade. PR #60.

Cadeia: ... <- #58 <- #59 <- #60. Restam: #53 MangaDex, #56 logo (decisao),
#16 curadoria.

## Sessao 03/09 — pagina do autor: so autoria e bio com ver mais (#69)

- Cadeia #19->#60 ja mergeada na main; branch nova feature/autor-papel-e-bio
  a partir da main. Conta gh ativa trocada para NicholasSchlindwein-dev
  (unica com push); git local do repo aponta para essa conta.
- Achado: AniList devolve todo o staffMedia, com papel em staffRole. Hara
  (Kingdom) vinha com Vagabond e Real como Assistant. Papeis vistos na API:
  Story & Art, Story, Art, Story & Art (vols 1-41), Original Creator,
  Original Story, Illustration, Illustration (vol 1), Assistant, Assistant
  (Former), Assistant (Background), Producer.
- Decisao do usuario: so autoria entra. Dominio ehPapelDeAutoria (regex com
  sufixo opcional entre parenteses), filtro antes da dedup em mapearAutor.
  Teste antes, vermelho, depois verde.
- Bio: componente client BioDoAutor com ver mais/ver menos; botao so quando
  scrollHeight > clientHeight.
- Provas: lint 0, 223 unitarios, build verde, print no browser das paginas
  do Urasawa (ver mais abre/fecha) e do Hara (so os 3 Kingdom).
- Pendencia da sessao: 48 arquivos de data/story-structures modificados na
  arvore, herdados de sessao anterior (#16 curadoria) — nao tocados, nao
  commitados aqui.

## Sessao 03/09 — lote 2 da curadoria narrativa (#16)

- Lote de 44 obras (01/09) estava na arvore sem commit. Contadores batiam,
  mas 8 arquivos reprovavam no validador do dominio: 7 em formato proprio
  ({name, range sem unit}) e Fire Force comecando no capitulo 0.
- Decisoes do usuario: aceitar capitulo 0; Berserk como caso de teste.
  Achado do Berserk: prologo sem numero na serializacao; listfist numera
  -16, MangaDex 0.01-0.09, Golden Age no cap. 1. Tracker so registra
  positivo (zod positive, Decimal(8,2)) -> base e o decimal do MangaDex;
  negativo segue recusado, com teste nomeando o caso.
- Validador ganhou: start >= 0, identidade obrigatoria do segmento (key,
  kind SAGA|ARC, title, status). Teste novo roda o validador nos 100 JSON
  reais e confere progress.json (quebrado de proposito: ficou vermelho).
- Os 7 arquivos foram normalizados por script (key slug do nome, kind ARC,
  position sequencial, unit CHAPTER, status DRAFT); intervalos e fontes
  intactos.
- Branch feature/curadoria-lote-2, 6 commits, PR aberto.
- PENDENTE (nao mexido, ja estava na main): Solo Leveling cap. 61 em dois
  arcos; Record of Ragnarok 4 sobreposicoes + 2 lacunas; Kaguya 18 lacunas
  sem registro de intencao. Abrir issue separada.
- PENDENTE de produto: capitulo 0 e 0.01 passam no validador, mas a API de
  progresso ainda exige positivo — quando a estrutura for pro banco, decidir
  se o tracker aceita 0.

## Sessao 03/09 — continuacao: lacunas e sobreposicoes (#16)

- Decisao do usuario: trecho entre arcos vira segmento explicito. Kind novo
  INTERLUDE no validador (teste antes) e no vault.
- Solo Leveling: cap. 61 so no Demon Castle (infobox da wiki: 61 = Demon
  Castle, 62 = Retesting). Ragnarok: 7/13/20/84 abrem o round seguinte
  (titulos dos capitulos sao do proximo round); 85 e 97 viram INTERLUDE;
  round 10 = 84 + 86-96. Kaguya: 18 INTERLUDE "Capitulos avulsos N-M".
- Teste dos 100 JSON ganhou contiguidade entre irmaos (mesmo parentKey):
  sem sobreposicao, sem lacuna, fim aberto so no ultimo. Quebrado de
  proposito: vermelho.
- Fandom bloqueia WebFetch (402); a API MediaWiki
  (/api.php?action=parse&prop=wikitext) responde ao curl com User-Agent.
- PR #71 atualizado com esses commits. Nao mergeado por decisao do usuario.
## Sessao 03/09 — seguir usuarios e curtir perfis (#74)

- Desenho no vault feature-seguir-usuarios (aprovado por pergunta: botao +
  contagens no perfil, curtida igual a de lista, sem feed nesta rodada).
- Migration `follow_profile_like` (Follow e ProfileLike, unico por par,
  Cascade dos dois lados, CHECK de auto-relacao a mao). Aplicada no dev e no
  teste; `pnpm prisma generate` + reiniciar dev depois (pegadinha do Prisma 7).
- Dominio social (podeSeRelacionar), repositorio social (toggles + resumo por
  viewer), servico social (por username; nao_encontrado / a_si_mesmo / ok),
  perfil.service com bloco `social`, rotas POST /usuarios/:username/seguir e
  /curtida ({ ativo, total }), tela acoes-sociais no header do perfil.
- Provas: lint 0, unitarios verdes, test:db 71, build verde, browser: seguir
  e curtir no /u/leitor2 persistem apos reload; /u/Roca mostra 1 seguindo;
  anonimo 401, inexistente 404.
- Ferramenta: para listar usuarios do dev sem expor a URL, script no
  scratchpad que le o .env (tem BOM — `^DATABASE_URL=` nao casa no grep).
- Pendente: paginas seguidores/seguindo; aba "Seguindo" no feed (#50).
- Pendente: paginas seguidores/seguindo; aba "Seguindo" no feed (#50).

## Sessao 03/09 — foto de perfil e vitrine da home (#76)

- Branch feature/home-vitrine-avatar EMPILHADA em feature/seguir-usuarios
  (o banco dev ja tinha a migration do Follow; sair da main quebrava o
  migrate dev com "migration missing"). PR com base em feature/seguir-usuarios;
  depois do merge do #75, rebase/retarget para main.
- Foto: migration user_avatar (bytes, mime, data no User). Dominio validarAvatar
  (jpeg/png/webp ate 512 KB), repositorio (bytes so em buscarAvatarPorUsername;
  teste trava), servico, rotas PUT/DELETE /perfil/avatar e GET
  /usuarios/:username/avatar (ETag = versao, 304, 404 sem foto, cache
  imutavel com ?v= na URL). Tela foto-de-perfil: recorte 256x256 JPEG no
  navegador (canvas), trocar/remover so para o dono.
  PEGADINHA: Prisma Bytes exige Uint8Array<ArrayBuffer> — copiar com
  new Uint8Array(bytes) antes do update.
- Vitrine: repositorios "mais curtidas desde" (groupBy nas curtidas da
  janela; acumulado antigo nao conta), servico vitrineDaHome (4 trilhos,
  janela 7 dias, fonte que falha vira vazio), componente Carrossel (rAF sobre
  scrollLeft, pausa hover/foco, setas, seletor, reduced-motion), cards, home
  reorganizada: Continuar lendo -> Resenhas -> Listas -> grade 2/3 catalogo
  (ver mais no fim) + 1/3 atividade recente.
- Provas: lint 0, unitarios, test:db 77, tsc, build, browser (upload via
  componente, remover, GET com 304/404/401, home com os dois carrosseis e a
  grade, aba Mais curtidas).
- Ferramenta: file_upload do Chrome so aceita arquivo compartilhado com a
  sessao; para testar upload, DataTransfer + dispatchEvent(change) via JS.
- Pendente: avatar nos cards do feed/resenhas; ajustar janela quando a
  comunidade crescer.
## Sessao 05/09 — modal de resenha transacional (#62)

- Branch feature/resenha-transacional saiu da main (arquivo identico nas duas).
- #53 (MangaDex por API) FECHADA sem implementar: a extensao (#52/#91) grava a
  URL real em resolvedUrl, o adapter perdeu razao de existir.
- Causa raiz da #62 e do sintoma novo (nota mudada no modal + cancelar ficava
  nas estrelas de fora): ModalDeResenha escrevia direto no estado do pai
  (setNota/setResenha/setSpoilers). Fechar nao desfazia nada.
- Fix em avaliacao-da-obra.tsx: modal com rascunho proprio (nota, resenha,
  spoilers) iniciado do salvo; so Salvar entrega ao pai. Pai nao guarda mais
  resenha/spoilers em estado — deriva das props (refresh atualiza). Estrela de
  fora persiste sempre a resenha JA SALVA.
- Provas: lint 0, 354 unitarios, next build verde (tsc so passou depois de
  apagar .next/dev/types, lixo do next dev da branch da extensao — rota
  leitura nao existe na main). Browser com usuario novo teste62: nota 4 no
  modal + Esc -> fora "sem nota"; rascunho digitado + Esc + estrela 4,5 fora
  -> 4,5 salva, botao "Resenhar…", texto nao foi; nota 3 + texto + Salvar ->
  persistiu; texto apagado no modal + fechar + "limpar" fora -> nota null,
  resenha salva sobreviveu (era o ramo DELETE destrutivo da #62).
- Pendente: commit + PR; fechar #62 depois de aprovado.

## Sessao 05/09 — continuacao: #67 (doc do seletor) e #61 (progresso manual)

- #67: uma linha em identidade-visual/CLAUDE.md, agora com as duas decisoes
  (31/08 segmentado, 01/09 swatch). PR #93 mergeado.
- #61 (TDD): dominio progressoAtual(marcado, maiorAberto) = maior dos dois,
  null so quando ambos null. abrirCapitulo usa esse valor em proximoCapitulo e
  progrideEstante (antes so olhava maiorCapitulo e ignorava progressChapter
  que ja carregava). Fake do teste do servico ganhou progressChapter — era o
  gap que deixou passar. Desenho no vault (feature-progresso-leitura) corrigido:
  "nunca divergem" virou "podem divergir, vale o maior".
- Provas: 8 testes novos vermelhos antes, 363 verdes depois; lint 0; tsc 0.
- ATENCAO: feature/extensao-navegador (12 commits, sem PR) tambem mexe em
  progresso.service.ts (promover para Lendo). Vai conflitar no rebase — a
  resolucao e manter `atual` no lugar de `maior`.

## Sessao 05/09 — continuacao: #63 (obra degrada) e #64 (portao de CI)

- #63 (TDD): buscarCompleta em obraParaPagina agora dentro de try/catch ->
  indisponivel. Teste "banco fora e indisponivel" vermelho antes, 364 verdes.
  Prova: next build sem DATABASE_URL + next start -> /, /obra/105398 e
  /obra/30002 respondem 200 com o aviso. PR #95.
- #64: .github/workflows/ci.yml (pull_request + push main): install, prisma
  generate, lint, test, test:db com Postgres 16 de servico
  (mymangatracker_test), pnpm build SEM DATABASE_URL. Roda em ~1 min.
  CLAUDE.md: o portao e o CI, a Vercel nao roda lint. PR #96.
  Prova: PR #97 descartavel com import ui->repository ficou vermelho em 37s
  no lint; fechado sem merge, branch apagada.
- ACHADO: o check "Vercel" (preview deployment) falha em TODO PR (#92, #94,
  #95, #96), enquanto o deploy de producao da main passa. Preexistente, nao
  investigado — provavelmente env do ambiente Preview. Abrir issue se quiser
  preview funcionando.
- PENDENTE de decisao do dono do repo: branch protection na main exigindo o
  check "lint, testes e build". Sem isso o CI avisa mas nao bloqueia o merge.

## Sessao 05/09 — continuacao: #65, os 50 achados da auditoria

- 8 PRs mergeados na main, cada um com CI verde: #99 indices (migration
  indices_consultas, com parcial a mao), #100 erros do Prisma discriminados +
  posicao pelo maximo, #101 paginas degradam + cache() no metadata, #102
  pequenos de tela, #103 capitulo com duas casas, #104 fonte com query +
  DELETE de item da lista, #105 health (session_secret, sonda lembrada 30s),
  #106 lint (sessao por arquivo, globais HTTP barrados).
- Balanco na issue: 36 feitos, 7 resolvidos por #61/#63/#64, 1 obsoleto,
  8 AGUARDANDO DECISAO (M15 rate limit, M16 paginacao de comentarios, M17
  ordem migrate/build, M18 reviewedAt, L5 social ao apagar resenha, L27
  oraculo de e-mail no cadastro, L28 username case, L30 codigo morto da
  curadoria). #65 fica aberta como guarda-chuva desses.
- LICAO (nao foi correcao do usuario, mas mordeu): eslint-plugin-boundaries 7
  casa `elements` contra PASTA; arquivo individual e `boundaries/files`
  (category), e as policies usam `file: { categories }`. O debug
  (ESLINT_PLUGIN_BOUNDARIES_DEBUG=1) avisa isso.
- Heredoc do bash com script Python grande quebra no parser da ferramenta;
  escrever o script em arquivo no scratchpad e rodar.
- Testes: 376 unitarios, 76 test:db.
