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
