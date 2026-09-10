# Adicionar obras pela página da lista — feature/adicionar-na-lista

## Objetivo

Adicionar obras a uma lista sem depender da estante. O lugar principal passa a
ser a página da própria lista: o dono busca no catálogo ali e adiciona. A lista
é curadoria, não leitura — quem só conhece a obra também pode listar.

## Escopo

- Página da lista (só o dono): campo de busca com termo na URL (`?q=`), como o
  catálogo. O servidor busca no AniList e renderiza os resultados com botão de
  adicionar; obra já na lista aparece marcada.
- Serviço novo `adicionarObraNaLista`: idempotente (não é toggle). Obra fora do
  cache `Media` é buscada no AniList (Kitsu como degrau de baixo, #219) e
  cacheada — mesmo padrão de `adicionarNaEstante`.
- `POST /api/v1/listas/:id/itens` passa a ADICIONAR. `DELETE` continua removendo.
  O toggle sai: era a causa do duplo clique que removia sem querer (#148, item 13).
- Botão "MINHAS LISTAS" da página da obra fica, mas visível também sem a obra
  estar na estante. Passa a usar POST para entrar e DELETE para sair.
- Texto de lista vazia aponta para a busca na própria página. Cinco idiomas.

## Regras específicas

- Serviço não toca em `headers()`: o IP do teto de busca é lido na página.
- Teto por usuário (`limitarItemDeLista`, 60/h) antes de ir ao AniList — é I/O
  de terceiro, como na estante.
- Cache serve em qualquer idade para lista: pertencer a uma lista não precisa
  de dados frescos, e poupa cota do AniList.
- Obra já na lista responde `ok` com `contem: true`, sem erro.

## Decisões tomadas

- Busca server-render via `?q=` na URL da lista, sem API nova de busca.
  Reusa `buscarNoCatalogo` e o teto por IP existente. Só o termo entra; os
  demais filtros do catálogo não valem na lista.
- Toggle removido do serviço e da rota. Dois verbos (POST/DELETE) em vez de um
  ambíguo. O widget da obra sabe o estado (`jaContem`) e pede o verbo certo.
- Resultados deduplicados por `anilistId` na página: o Kitsu repete obras na
  mesma página (visto em 10/09 com o AniList fora). O catálogo tem o mesmo
  sintoma — fica para issue própria.
- Painel de resultados com altura máxima e rolagem própria (36 linhas).
- Branch nova a partir da `main`; merge quando a tela estiver validada.

## Validação em 10/09/2026

- 710 testes, lint e `tsc` limpos.
- Chromium local, logado: página de lista alheia não mostra busca; lista
  própria com `?q=berserk` mostra resultados, "✓ na lista" no Berserk; "+
  adicionar" gravou (POST 200 em 3,9s — AniList fora, foi pelo Kitsu) e a
  lista passou a 3 obras.
- Página da obra sem estante: "+ Lista" visível; clique gravou (POST 200) e o
  segundo clique removeu (DELETE 200).

## Pendências

- Issue para as duplicatas do Kitsu no catálogo (`colecao-do-catalogo` só
  dedupe no "ver mais").

## Referências

- Issue: #237
- `feature-lists/CLAUDE.md` — a implementação original das listas (#41, #51).
