# feature/lists — bloco D: listas de obras

## Objetivo

O Lists do Letterboxd: usuário cria lista nomeada, enche de obras, todo mundo
vê. Estimula criatividade e brincadeira — pedido direto do usuário.

## Decisões tomadas (01/09)

- **Públicas desde o início** — mesmo recorte do social aprovado no bloco B:
  username do dono, e-mail e ids de usuário nunca saem.
- `List`: nome 1–100 (CHECK de não-vazio à mão), descrição opcional.
  Nome NÃO é único (como no Letterboxd). `ListItem`: uma obra por lista
  (`@@unique(listId, mediaId)`), ordem = posição de inserção (append).
- MVP: criar, apagar a própria, adicionar/remover obra (só o dono).
  **Fora do MVP** (pendências): editar nome/descrição, reordenar itens,
  curtir/comentar lista.
- Adição a partir da página da obra, por `anilistId` — a obra já está no
  cache porque a página foi visitada.
- Telas: `/listas` (recentes de todo mundo + criar quando logado) e
  `/listas/[id]` (grade de capas, remover/apagar quando dono). Link no menu.
- Leitura server-side; API só para ações (padrão dos blocos anteriores).

## Escopo

1. Migration aditiva List + ListItem + CHECK, provada quebrando.
2. Repositório: criar/apagar (dono), listar públicas (preview de capas),
   buscar lista com itens, minhas listas com "já contém", add/remover item
   com dono verificado.
3. Serviço TDD: nome 1–100; ações só do dono; obra precisa existir no cache.
4. Rotas: POST/DELETE /api/v1/listas[/:id], POST/DELETE itens, GET minhas.
5. Telas + botão na página da obra + menu.

## Referências

- Print do Letterboxd (Popular Lists) na conversa de 01/09.
- Visibilidade: feature-reviews-sociais/CLAUDE.md.
