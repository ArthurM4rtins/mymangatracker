# feature-estante — adicionar à estante e cache do Media

Cobre a issue **#10** (e o terreno da **#11**). Junto vem o **redesign do `/catalogo`**
pedido pelo usuário em 31/08 — a tela ganha o botão de estante, então reorganiza uma vez só.

## Objetivo

`POST /api/v1/estante`: primeira escrita que cruza AniList e banco. O `Media` vira cache
por `anilistId` com TTL de 24h; o `ShelfEntry` nasce/atualiza por upsert.

## Decisões tomadas

- **TTL do cache é regra de domínio**: `domain/media-cache.ts` com `cacheEstaFresco(syncedAt,
  agora)`, 24h. Relógio entra injetado no serviço — teste não espera o tempo passar.
- **O serviço não confia no payload da tela**: o botão manda só `anilistId` + `status`.
  Os dados da obra vêm do cache ou de `infra/anilist.buscarMediaPorId` (nova função) —
  nunca do corpo da requisição, senão o cache viraria dado forjável.
- **`mapearMedia` null → nada no banco**: obra que o domínio descarta devolve erro
  `obra_desconhecida`, não linha em `Media`.
- **Upsert dos dois lados**: `Media` por `anilistId`; `ShelfEntry` por `(userId, mediaId)` —
  adicionar de novo atualiza o status, não duplica (a regra é do `@@unique` do banco).
- **Status inicial do botão: `PLANNED`** ("quero ler"). Mudar status é a #11.
- **Sem sessão → 401** no controller; a tela manda pro `/entrar`.
- **Redesign do catálogo**: grade de cards com capa em destaque (2 col ≥sm), badge de
  tipo/país, capítulos, descrição em clamp, botão de estante por card.

## Pendências

- [x] Fatia #10 implementada e provada (31/08): teste vermelho antes; sonda "cache nunca
  fresco" vista derrubando 4 testes; 78 unitários verdes; lint e build verdes; no browser,
  `+ Estante` sem sessão → 401 → `/entrar`.
- [x] Redesign do `/catalogo`: grade 2 colunas, capa 96×144, badges de tipo, capítulos
  tabulares, descrição em clamp, botão por card.
- [ ] `pnpm test:db` para os upserts (`estante.upsert.test.ts` escrito) — pendente de Postgres
- [ ] Fluxo logado de ponta a ponta (adicionar de verdade) — precisa de banco + SESSION_SECRET
- [ ] #11: tela `/estante` + mudar status (próxima)
- [ ] Commits quando o git liberar

## Notas de implementação (31/08)

- `infra/anilist.buscarMediaPorId` usa `Page.media(id:)` em vez de `Media(id:)` — id
  inexistente vira lista vazia (null), não erro de GraphQL indistinguível de rate limit.
- Novos módulos: `domain/media-cache`, `services/estante.service`, `repositories/media.repository`,
  `repositories/shelf.repository`, `POST /api/v1/estante`, `catalogo/botao-estante.tsx`.

## Referências

- Issue: https://github.com/ArthurM4rtins/mymangatracker/issues/10
- Desvio do slice: `Obsidian/02. Implementacoes/slice-vertical/CLAUDE.md`
