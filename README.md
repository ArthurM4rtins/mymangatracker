# MyMangaTracker

Sua estante de mangá, manhwa e novel — que lembra sozinho em que capítulo você parou.

**No ar:** https://mymangatracker.vercel.app · **Saúde:** [`/api/v1/health`](https://mymangatracker.vercel.app/api/v1/health)

Trabalho de faculdade: front-end, back-end, ORM e banco, em arquitetura de camadas com deploy contínuo.
Integrantes: Arthur Juchem Martins e Nicholas Gabriel Deotti Schlindwein.

---

## O problema

Registrar filme é problema resolvido: existe onde logar o que se viu, dar nota, escrever resenha e montar
lista. Mídia serializada não tem esse lugar — e tem um problema que filme não tem: a obra continua saindo,
em capítulos, espalhada por sites diferentes.

Pedir o número do capítulo toda vez é o tipo de trabalho que faz o usuário abandonar o app na terceira
semana. Aqui ele informa **uma coisa só, uma vez**: onde lê, colando o link do primeiro capítulo.

O sistema quebra a URL em segmentos, acha os candidatos a "número do capítulo" e monta um template.
Em `/title/Lookism/chapter/1/1` há **dois** segmentos valendo `1` — o do capítulo e o da página. Ele não
escolhe em silêncio: ranqueia o que vem depois de `chapter`, `cap` ou `ch`, mostra o link previsto do
capítulo 2 e pede confirmação. Um clique. Dali em diante o progresso anda sozinho.

## A regra que não se negocia

`ReadingSource` e `ReadingProgress` são **privados do dono**. Um diretório público de onde cada obra é
lida vira alvo, então a visibilidade não é uma caixinha que o usuário desmarca — é invariante do sistema.
Toda consulta carrega `userId`, e existe teste que falha se alguém escrever uma consulta sem esse filtro.

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript |
| Front | React 19 + Next.js 16 (App Router) |
| Estilo | Tailwind v4 |
| Back | Route Handlers — API REST versionada em `/api/v1` |
| ORM | Prisma 7 com driver adapter (`@prisma/adapter-pg`) |
| Banco | PostgreSQL 16 — Neon em produção, Docker Compose no dev |
| Sessão | cookie httpOnly + JWT via `jose`, senha com `scrypt` do Node |
| Catálogo | Kitsu como fonte principal; AniList como fallback; cache local se ambos falharem |
| Testes | Vitest |

O catálogo consulta o Kitsu primeiro, recorre ao AniList em caso de falha e usa o
cache local se os dois falharem. Uma busca vazia do Kitsu encerra normalmente.
Obras com links antigos do AniList usam o mapeamento do Kitsu; sem esse mapeamento,
o AniList ainda pode resolvê-las. Os identificadores e metadados já salvos são
preservados quando uma fonte retorna dados parciais. Perfis de autores do Kitsu
incluem foto, biografia e obras de autoria; links antigos de autores continuam
consultando o AniList, pois os IDs de pessoas não são intercambiáveis.
Recomendações de similares continuam específicas do AniList; as relações entre
obras do Kitsu aparecem em uma seção própria.

## Arquitetura em camadas

```
Apresentação   src/app/(ui)             telas, componentes
Controllers    src/app/api/v1           valida com Zod, resolve sessão, delega
Serviços       src/server/services      casos de uso, transações
Repositórios   src/server/repositories  único ponto que importa o Prisma Client
Infra          src/server/infra         anilist, config
Domínio        src/server/domain        regras puras, zero imports do projeto
```

A dependência tem sentido único, e isso **não é convenção de boa vontade**: é cobrado pelo
`eslint-plugin-boundaries`. Se a tela importar repositório, `pnpm lint` falha e o deploy não sai.

```
Camada 'ui' nao pode importar 'repository'
Camada 'ui' nao pode importar 'infra'
Somente src/server/repositories importa o Prisma Client
Sessao, cookies e headers sao resolvidos no controller, nunca em 'service'
```

## Rodar local

Precisa de Node 22, pnpm e Docker.

```bash
docker compose up -d                    # Postgres local
pnpm install
cp .env.example .env                    # e preencher
pnpm prisma migrate dev
pnpm dev
```

O banco de teste é separado, e criado uma vez:

```bash
docker compose exec postgres createdb -U mymangatracker mymangatracker_test
```

### Variáveis

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Postgres. Em produção é injetada pela integração Neon da Vercel — nunca definida à mão |
| `DATABASE_URL_TEST` | banco do `pnpm test:db`. Precisa terminar em `_test`, e o script recusa qualquer outro nome |
| `SESSION_SECRET` | segredo do JWT de sessão |
| `ANILIST_ENDPOINT` | opcional; o default aponta para `https://graphql.anilist.co` |

## Comandos

```bash
pnpm dev          # servidor de desenvolvimento
pnpm build        # prisma generate + migration condicional + next build
pnpm lint         # inclui as regras de camada
pnpm test         # domínio e serviços — não toca banco
pnpm test:db      # repositórios, contra o Postgres do Compose
```

`pnpm test` roda sem Docker de propósito: domínio e serviços usam dependências injetadas, então a suíte
padrão fica verde em qualquer máquina.

## O build não depende do banco

`next build` roda sem `DATABASE_URL`. A migration só é aplicada quando a variável existe:

```
[migrate] DATABASE_URL ausente — pulando `prisma migrate deploy`.
```

É o que permite o primeiro deploy sair antes do banco existir. Página que lê banco vai dinâmica e degrada
com aviso de configuração pendente, em vez de estourar — a home responde **200** mesmo sem Postgres, e
`/api/v1/health` reporta `degraded`, não `down`. Configuração pendente não é falha do serviço.

## Testes

TDD-first: o teste que trava a regra vem **antes** da implementação, falha por motivo claro, e só então
a função que faz passar.

Verde sozinho não prova nada. Cada invariante do projeto foi visto **falhando** com a proteção removida:

| Proteção removida | O que ficou vermelho |
|---|---|
| `where: { userId, mediaId }` virou `where: { mediaId }` | os testes de privacidade do progresso |
| `DROP INDEX` do índice único parcial | o teste da segunda fonte ativa |
| erro da sonda entrando no payload | o teste de vazamento do `/api/v1/health` |
| import proibido entre camadas | `pnpm lint` |

## Banco

- `@@unique([userId, mediaId])` em `ShelfEntry` — uma linha por obra por usuário, regra do banco.
- Índice único **parcial** em `ReadingSource`: muitas fontes por obra, só uma ativa. Escrito à mão na
  migration, porque o Prisma não gera índice parcial.
- `@@index([userId, mediaId, openedAt DESC])` — o índice nasce na direção da consulta mais frequente.
- `Media` é cache do AniList: se sumir, é reconstruído. Por isso as FKs que apontam para ele são
  `Restrict`, não `Cascade` — cache não apaga dado de usuário.

## Dependências

`next`, `react`, `react-dom`, `prisma`, `@prisma/client` e `@prisma/adapter-pg` são
**pinados**. Os três do Prisma têm um motivo específico: a tag `latest` do CLI já
esteve num major à frente do client, e `pnpm add` monta a combinação quebrada sem
avisar (registrado em `tasks/lessons.md`). O resto usa caret.

`pnpm audit` reporta seis avisos, três altos e três moderados. **Todos** passam por
`prisma`, o CLI: lodash via `@prisma/studio-core`, `deepmerge-ts` via
`@prisma/config`, e `mysql2` direto. O CLI é `devDependency` e peer opcional do
client, então o tracing do Next não o leva para o bundle da função, e nada sob
`src/` importa qualquer um dos três. Não há ação de runtime a tomar, e o CI não
roda `audit` justamente por isso. Se um dia algum deles aparecer numa dependência
de produção, aí é bug, não ruído (#148, item 15).

## Deploy

Push na `main` → build automático na Vercel → `prisma generate` → migration condicional → `next build`.

### O banco só existe em produção

O recurso do Neon está marcado como **Production environment only** na Vercel. Preview e Development
**não recebem `DATABASE_URL`**, e isso é de propósito, por dois motivos:

1. **O plano Free tem limite de branches.** Enquanto o recurso valia para todos os ambientes, cada
   preview criava um branch do banco, os órfãos se acumulavam e o deploy passou a morrer na etapa de
   provisionamento — antes de instalar dependência, antes de buildar. O check da Vercel ficou vermelho
   em **todo** PR por semanas, e um check que sempre falha ensina o time a ignorar o vermelho (#162).
2. **Não há revisão de tela em preview hoje.** O preview de verdade é local, com `pnpm dev`.

Preview então serve a tela com a faixa de configuração pendente e o resto funcionando, que é o
comportamento desenhado na Fase 1 — o build não depende do banco.

⚠️ **Religar o Neon para Preview traz o problema de volta.** Se um dia fizer falta (revisão de tela
por PR, por exemplo), o caminho é branch efêmero por PR **com limpeza automática**, e provavelmente
plano pago. Não basta marcar "All environments".

### A migration

`prisma migrate deploy` só roda quando `VERCEL_ENV` é `production` ou não existe (desenvolvimento
local). Preview nunca aplica DDL, mesmo que um dia volte a ter banco (#148, item 8).

## Documentação

- `CLAUDE.md` — convenções, regras absolutas e fluxo de trabalho.
- `tasks/todo.md` — estado atual e próximos passos.
- `tasks/lessons.md` — o que já mordeu, e a regra que evita repetir.
- `Obsidian/02. Implementacoes/` — o desenho de cada tarefa, antes da implementação.
