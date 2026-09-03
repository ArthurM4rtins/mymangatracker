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

## Evolução — issue #51 (desenho de 02/09, aprovado nos três pontos e implementado)

Três pedaços, um PR (#60), commits por camada. Branch `feature/lists-evolucao`,
empilhada em `feature/feed-atividade`. Aprovado pelo usuário em 02/09: setas
em vez de arrastar, curtida só como número, `/listas` segue por recente.

Como ficou: setas na página da lista são ← → (grade é horizontal), com a ordem
otimista e `key` na grade pelo conjunto de ids pra remontar depois do refresh.
O `migrate dev` do Prisma 7 NÃO regenera o client — `prisma generate` à mão,
senão `listLike` não existe no tipo.

### 1. Editar nome e descrição (só o dono)

- `PATCH /api/v1/listas/:id` com `{ nome?, descricao? }`. Zod no controller.
- Serviço `editarListaDoUsuario`: mesma regra da criação (nome 1–100 após
  trim, descrição em branco vira null). Alheia/inexistente = `nao_encontrada`.
- Repositório `editarLista(userId, listaId, campos)`: `updateMany` com
  userId no where — a posse decide no banco, como apagar.
- Tela: na página da lista, o dono vê "editar" ao lado do nome; vira
  formulário inline (nome + descrição, salvar/cancelar).

### 2. Reordenar itens (só o dono)

- **Setas subir/descer, não arrastar.** Arrastar pede biblioteca ou muito
  código de ponteiro; seta é um clique, funciona no teclado e no celular.
- `PUT /api/v1/listas/:id/ordem` com `{ anilistIds: number[] }` — a ordem
  INTEIRA, de uma vez. Idempotente, uma chamada por clique.
- Domínio `lista-ordem.ts` (TDD): `mesmoConjunto(atual, proposto)` — a
  proposta tem que ser permutação exata dos itens atuais (sem faltar, sem
  sobrar, sem repetir); senão `ordem_invalida`. `mover(ordem, id, direcao)`
  pura, usada pela tela pra montar a proposta.
- Repositório `reordenarItens(userId, listaId, mediaIds[])`: transação que
  grava `position = índice + 1` em cada item. `adicionarItem` continua
  `_count + 1`, então append segue no fim.

### 3. Curtir lista (qualquer logado)

- **Tabela nova `ListLike`** (`listId`, `userId`, `@@unique(listId, userId)`,
  Cascade dos dois lados) — cópia do `ReviewLike`. Migration aditiva,
  validada no banco local antes de subir.
- `POST /api/v1/listas/:id/curtida` toggle → `{ curtida, total }`, mesmo
  contrato do like de resenha.
- Leitura: `ListaPublica` e `ListaComItens` ganham `curtidas`; a com itens
  ganha `curtiPorMim` (userId opcional só marca, não filtra).
- Só contagem é pública. Quem curtiu não aparece (como nas resenhas).
- Tela: botão de curtida na página da lista (otimista, como na resenha);
  contagem no card de `/listas` e no feed.

### Fora deste PR

- Ordenar `/listas` por mais curtidas ("populares") — hoje segue recente.
- Comentário em lista — fase social.

## Referências

- Print do Letterboxd (Popular Lists) na conversa de 01/09.
- Visibilidade: feature-reviews-sociais/CLAUDE.md.
