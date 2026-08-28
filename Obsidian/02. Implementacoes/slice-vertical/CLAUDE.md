# slice-vertical

Branch: `feature/slice-vertical`. Fonte de verdade desta tarefa.
Regras gerais estão no `CLAUDE.md` da raiz — aqui só o que é específico.

## Objetivo

Fazer o link entregue ao professor mostrar algo real, e provar que o app **conversa** com o
banco — não só que a migration rodou no build.

Hoje https://mymangatracker.vercel.app serve `<title>Create Next App</title>`. O Neon está
conectado e a migration `20260828004616_entidades_fase_1` foi aplicada, mas nenhuma linha de
código do projeto abriu conexão em produção ainda.

## Escopo

| Rota | O que faz | Precisa de banco? |
|---|---|---|
| `GET /api/v1/health` | reporta o estado de cada dependência | não — reporta a ausência |
| `/` | status do sistema, legível por humano | não |
| `/catalogo` | busca obras no AniList | não |

Fora: `/entrar`, `/cadastrar`, `/estante` — dependem de sessão, que é de outra tarefa.

## Contrato do `/api/v1/health`

```json
{
  "status": "ok",
  "checkedAt": "2026-08-28T00:00:00.000Z",
  "dependencies": [
    { "name": "database", "status": "ok",             "latencyMs": 12 },
    { "name": "anilist",  "status": "ok",             "latencyMs": 120 }
  ]
}
```

Estados por dependência: `ok`, `down`, `not_configured`.

Estado geral, derivado — é a regra que o teste de domínio trava:

| Situação | Geral |
|---|---|
| todas `ok` | `ok` |
| alguma `not_configured`, nenhuma `down` | `degraded` |
| alguma `down` | `down` |

HTTP: **200** para `ok` e `degraded`, **503** para `down`. Configuração pendente não é falha do
serviço — é estado conhecido e reportado, e o app continua servindo o que não depende dela.

## Regras específicas

- **O health nunca vaza string de conexão, host, usuário ou stack trace.** Só o nome da
  dependência, o estado e a latência. Erro vira `down` com uma mensagem fixa, não com o texto do
  driver — mensagem de erro de banco carrega host e usuário.
- **A chamada ao AniList nunca sai da camada de infra, e nunca sai do navegador.** O AniList
  limita requisições por minuto; quem fala com ele é o servidor. Painel 05 do artifact.
- Página que lê banco vai **dinâmica** e degrada com aviso de configuração pendente, nunca
  estoura. Regra do `CLAUDE.md` da raiz, e é o que mantém o link do professor de pé.
- `/` e `/catalogo` são públicas e não tocam dado de usuário. `ReadingSource` e `ReadingProgress`
  não aparecem em nenhuma das duas — nem devem ser importados aqui.

## Camadas

```
src/app/(ui)/page.tsx              status do sistema
src/app/(ui)/catalogo/page.tsx     busca no AniList
src/app/api/v1/health/route.ts     controller: sem regra, só delega e serializa

src/server/services/health.service.ts     agrega os checks
src/server/services/catalogo.service.ts   busca via infra

src/server/repositories/health.repository.ts   ping no Postgres
src/server/infra/anilist.ts                    ÚNICO ponto que fala com graphql.anilist.co
src/server/infra/config.ts                     lê env, com default

src/server/domain/health-status.ts    reduz os checks no estado geral (puro)
src/server/domain/anilist-media.ts    mapeia a resposta do AniList (puro)
```

O `boundaries` já cobra essa direção — nada aqui é convenção de boa vontade.

## Decisões tomadas

| Decisão | Valor | Motivo |
|---|---|---|
| `ANILIST_ENDPOINT` | default `https://graphql.anilist.co` embutido | a API é pública e sem chave; exigir env só para funcionar seria configuração inútil |
| `down` → HTTP 503 | sim | monitor externo entende; `degraded` fica 200 porque o app serve |
| Latência no payload | sim | é o dado que mostra que a conexão foi de verdade, não um `true` chutado |

## Desvio do painel 05 — cache no `Media`

O painel 05 mostra a infra do AniList gravando cache de 24 h em `Media`. **Nesta tarefa a busca
não grava cache.**

Motivo: `/catalogo` tem que funcionar **sem banco** — é o que garante que o link mostra algo real
mesmo com o Postgres fora. Gravar cache exigiria ou uma escrita condicional espalhada pelo
serviço, ou tornar a tela dependente do banco. As duas contradizem o objetivo.

O cache entra na tarefa que **precisa** de uma linha em `Media`: adicionar obra à estante, que já
grava `ShelfEntry.mediaId` e portanto já exige o registro. Ali o `syncedAt` passa a ter uso, e o
TTL de 24 h é implementado com a tela que o exercita.

## Ordem de execução — TDD

O teste vem antes, falha por motivo claro, e só então a implementação.

1. `tests/domain/health-status.test.ts` → falha
2. `src/server/domain/health-status.ts` → passa
3. `tests/domain/anilist-media.test.ts` → falha
4. `src/server/domain/anilist-media.ts` → passa
5. `tests/services/health.service.test.ts`, com as dependências injetadas → falha
6. infra, repositório e serviço → passa
7. `src/app/api/v1/health/route.ts`
8. telas `/` e `/catalogo`
9. `pnpm build` sem `DATABASE_URL` verde, `pnpm test`, `pnpm test:db`, `pnpm lint`

## Pendências

1. **`tests/services/` não é coletado hoje.** O `vitest.config.mts` inclui só
   `tests/domain/**/*.test.ts`. Precisa passar a `tests/{domain,services}/**/*.test.ts` — os
   testes de serviço usam dependências injetadas e não tocam banco, então continuam no
   `pnpm test`, sem Docker.

2. **Verificação em produção.** Depois do merge, conferir `curl https://mymangatracker.vercel.app/api/v1/health`
   e ver `database: ok` com latência real. É esse o item que fecha o checklist da Fase 1 — não o
   log da migration.

## Referências

- Apresentação aprovada: https://claude.ai/code/artifact/10425b3e-b3fd-4013-a3a5-fa18e220e58a
  — painel 05 (fluxo e infra do AniList), painel 07 (stack), painel 08 (deploy).
- Handoff da Fase 1: `tasks/todo.md`, passo 6.
- Tarefas anteriores: boilerplate #1/#2, schema #3/#4.
