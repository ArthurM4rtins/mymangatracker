# schema-fase-1

Branch: `feature/schema-fase-1`. Fonte de verdade desta tarefa.
Regras gerais estão no `CLAUDE.md` da raiz — aqui só o que é específico.

## Objetivo

Colocar no banco as cinco entidades que a Fase 1 usa, e travar com teste as duas regras que
não podem depender de disciplina de quem escreve a query: a derivação do template de URL e a
privacidade do progresso.

## Escopo

Entram: `User`, `Media`, `ShelfEntry`, `ReadingSource`, `ReadingProgress`.

Ficam fora, para migration aditiva depois: `Entry`, `List`, `ListItem`, `Follow`,
`MediaRequest`, `Genre`, `MediaGenre`, `EntryLike`, `ListLike`. Cada uma tem tela de Fase 4/5;
criar tabela sem tela que a use é peso morto na migration.

## Modelo proposto

### `User`

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `username` | `String @unique` | |
| `email` | `String @unique` | |
| `passwordHash` | `String` | `scrypt` do `node:crypto`, nunca a senha |
| `role` | `Role @default(USER)` | `enum Role { USER, ADMIN }` |
| `createdAt` / `updatedAt` | `DateTime` | |

### `Media` — cache do AniList

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `anilistId` | `Int @unique` | chave de reconciliação com a API |
| `type` | `MediaType` | `enum MediaType { MANGA, NOVEL }` |
| `countryOfOrigin` | `CountryOfOrigin?` | `enum { KR, JP, CN }` |
| `titleRomaji` | `String` | |
| `titleEnglish` / `titleNative` | `String?` | |
| `coverImageUrl` | `String?` | |
| `description` | `String?` | |
| `chapters` | `Int?` | total conhecido, pode ser nulo em obra em publicação |
| `syncedAt` | `DateTime` | TTL do cache |
| `createdAt` / `updatedAt` | `DateTime` | |

Manhwa e manhua **não** viram valor de `MediaType` — a distinção é `countryOfOrigin`, como no
AniList. `MediaType` guarda o formato, e é por isso que cabe `ANIME` e `LIVE_ACTION` depois por
`ALTER TYPE ... ADD VALUE`, que é aditivo e não toca linha existente. Nada no schema se chama
`Manga`, conforme o painel 06.

### `ShelfEntry`

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `userId` | FK `User`, `onDelete: Cascade` | apagou a conta, sumiu a estante |
| `mediaId` | FK `Media`, `onDelete: Restrict` | ver **Regras específicas** |
| `status` | `ShelfStatus` | `enum { READING, COMPLETED, PLANNED, PAUSED, DROPPED }` |
| `progressChapter` | `Decimal? @db.Decimal(8,2)` | resumo do `ReadingProgress` |
| `startedAt` / `finishedAt` | `DateTime?` | |
| `createdAt` / `updatedAt` | `DateTime` | |

- `@@unique([userId, mediaId])` — uma linha por obra por usuário, regra do banco e não do código.
- `@@index([userId, status])` — a estante é lida por aba de status.

### `ReadingSource` — PRIVADO

O que o **usuário** escreve.

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `userId` | FK `User`, `onDelete: Cascade` | |
| `mediaId` | FK `Media`, `onDelete: Restrict` | |
| `sourceHost` | `String` | host, sem esquema nem caminho |
| `urlTemplate` | `String` | ex.: `/title/Lookism/chapter/{chapter}/1` |
| `isActive` | `Boolean @default(true)` | |
| `confirmedAt` | `DateTime?` | preenchido quando o usuário confirma o preview |
| `createdAt` / `updatedAt` | `DateTime` | |

- `@@index([userId, mediaId])`
- Índice único **parcial**, escrito à mão na migration — o Prisma não gera:

```sql
CREATE UNIQUE INDEX "ReadingSource_userId_mediaId_active_key"
  ON "ReadingSource" ("userId", "mediaId")
  WHERE "isActive";
```

Várias fontes cadastradas por obra, só uma ativa. O Postgres recusa a segunda, então o serviço
não precisa conferir.

### `ReadingProgress` — PRIVADO

O que o **sistema** grava.

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `userId` | FK `User`, `onDelete: Cascade` | |
| `mediaId` | FK `Media`, `onDelete: Restrict` | |
| `readingSourceId` | FK `ReadingSource?`, `onDelete: SetNull` | ver **Regras específicas** |
| `chapter` | `Decimal @db.Decimal(8,2)` | existe capítulo 57.5 |
| `resolvedUrl` | `String` | o link que foi realmente aberto |
| `openedAt` | `DateTime @default(now())` | |

- `@@index([userId, mediaId, openedAt(sort: Desc)])` — o índice nasce na direção de "qual foi o
  último capítulo aberto", que é a consulta mais frequente do app.

## Regras específicas

- **`onDelete` do `mediaId` é `Restrict`, não `Cascade`.** `Media` é cache reconstruível; estante
  e progresso são dado do usuário. Cascade ali significaria perder histórico de leitura por causa
  de uma limpeza de cache. O banco passa a recusar apagar `Media` que tenha linha de usuário — que
  é exatamente o comportamento desejado.
- **`readingSourceId` é anulável com `SetNull`.** O progresso pertence à obra, não ao site. Trocar
  de fonte, ou apagar a fonte antiga, não pode apagar o histórico.
- **Toda consulta a `ReadingSource` e `ReadingProgress` carrega `userId`.** Invariante do sistema.
  O teste de privacidade é o que trava isso.
- Progresso é o **maior** capítulo aberto, não a contagem de aberturas. `ShelfEntry.progressChapter`
  é resumo, `ReadingProgress` é a linha do tempo.
- Abrir um capítulo grava `ReadingProgress` e atualiza `ShelfEntry.progressChapter` dentro de
  `$transaction` — ou os dois, ou nenhum. O serviço é da próxima tarefa, mas o schema já precisa
  suportar.

### Restrições que saem à mão na migration

O Prisma não gera `CHECK`:

```sql
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_chapter_positivo" CHECK ("chapter" > 0);
ALTER TABLE "ShelfEntry" ADD CONSTRAINT "ShelfEntry_progressChapter_positivo" CHECK ("progressChapter" IS NULL OR "progressChapter" > 0);
```

## Derivação do template de URL

Domínio puro, sem import do projeto. Duas funções:

```ts
derivarCandidatos(urlDoCapitulo1: string): CandidatoTemplate[]  // ordenado, melhor primeiro
aplicarTemplate(template: string, chapter: number): string
```

O caso difícil é o do painel 02: `/title/Lookism/chapter/1/1` tem **dois** segmentos com valor `1`.
O algoritmo quebra a URL em segmentos, marca cada segmento cujo valor é `1` como candidato, e
ordena dando peso ao que vem logo depois de um segmento como `chapter`, `cap` ou `ch`. Nunca
escolhe sozinho em silêncio: devolve a lista para a tela mostrar o preview do capítulo 2 e o
usuário confirmar em um clique.

Casos que o teste cobre:

| Entrada | Esperado |
|---|---|
| `/title/Lookism/chapter/1/1` | 2 candidatos; vence o índice 3 (depois de `chapter`) |
| `/manga/Solo-Leveling/cap/1` | 1 candidato, índice 3 |
| `/read/ch/1/page/1` | 2 candidatos; vence o índice 2 (depois de `ch`) |
| `/manga/Lookism` | lista vazia — nada a derivar |
| `aplicarTemplate("/title/Lookism/chapter/{chapter}/1", 2)` | `/title/Lookism/chapter/2/1` |
| `aplicarTemplate(t, 57.5)` | `.../57.5/...`, não `57` |

## Ordem de execução — TDD

O teste vem antes, falha por motivo claro, e só então a implementação.

1. `tests/domain/url-template.test.ts` → falha (módulo não existe)
2. `src/server/domain/url-template.ts` → passa
3. `prisma/schema.prisma` com as cinco entidades
4. `docker compose up -d` e `pnpm prisma migrate dev` → migration gerada
5. editar a migration à mão: índice parcial e os dois `CHECK`; reaplicar e conferir
6. `tests/repositories/reading-progress.privacy.test.ts` → falha
7. `src/server/repositories/reading-progress.repository.ts` → passa
8. conferir que `pnpm build` sem `DATABASE_URL` continua verde

## Decisões tomadas

| Decisão | Valor | Motivo |
|---|---|---|
| `chapter` | `Decimal(8,2)` | `57.5` é o caso conhecido; duas casas cobre `57.25` sem custo |
| `id` | `cuid()` | não expõe ordem de cadastro numa URL pública, ao contrário de `autoincrement()` |
| `mediaId` | `onDelete: Restrict` | cache não apaga dado de usuário |
| `readingSourceId` | `onDelete: SetNull` | progresso pertence à obra, não ao site |
| Manhwa/manhua | `countryOfOrigin`, não `MediaType` | igual ao AniList; `MediaType` fica livre para `ANIME` depois |

## Decisoes resolvidas na aprovacao

| Pendencia | Decisao |
|---|---|
| Nome de coluna | Segue o padrao real do Prisma: tabela em `PascalCase`, coluna em `camelCase`. A redacao do `CLAUDE.md` da raiz foi corrigida, nao o schema |
| Banco dos testes | `mymangatracker_test` no mesmo container, `DATABASE_URL_TEST` no `.env`. `pnpm test` roda so `tests/domain` (sem banco, sempre verde); `pnpm test:db` roda `tests/repositories` |
| `ShelfStatus` | Cinco valores confirmados: `READING`, `COMPLETED`, `PLANNED`, `PAUSED`, `DROPPED` |

## Referências

- Apresentação aprovada: https://claude.ai/code/artifact/10425b3e-b3fd-4013-a3a5-fa18e220e58a
  — painel 01 (motivo da privacidade), painel 02 (derivação do template), painel 06 (modelo).
- Handoff da Fase 1: `tasks/todo.md`.
- Boilerplate: issue #1, PR #2.
