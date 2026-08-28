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
- [ ] deploy na Vercel respondendo
- [ ] Neon conectado, migration aplicada, `/api/v1/health` reportando banco OK
- [ ] links do repo e do ar atualizados no artifact (painel do cabeçalho e checklist do painel 09)

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
