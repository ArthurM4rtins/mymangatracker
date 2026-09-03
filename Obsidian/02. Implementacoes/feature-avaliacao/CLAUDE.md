# feature/avaliacao — nota e resenha estilo Letterboxd

## Objetivo

Rankear obras (0,5–5,0 estrelas) e escrever resenha, como no Letterboxd —
benchmark de produto, não de estética (lessons.md).

## Decisões tomadas (01/09, aprovadas pelo usuário)

- **Uma avaliação por (userId, mediaId)**, editável — `@@unique`. Diário de
  re-leituras (múltiplas resenhas datadas) fica como evolução futura.
- Nota 0,5–5,0 em **passos de 0,5** (meia estrela). CHECK à mão na migration —
  regra do repo: CHECK não sai do schema do Prisma.
- Nota e resenha **independentes**: pode só nota, só resenha, ou ambas.
  Avaliação sem nenhuma das duas não existe (apagar = DELETE).
- Flag `containsSpoilers` na resenha.
- Visível **só ao dono** por enquanto — perfil público é fase futura. Não entra
  na invariante absoluta (essa é só ReadingSource/ReadingProgress), mas toda
  consulta carrega userId igual.
- Entidade `Entry` (nome do painel 06 da apresentação), migration **aditiva**
  gerada com `--create-only` para receber o CHECK antes de aplicar.

## Escopo

1. Migration: model `Entry` (rating Decimal(2,1)?, review Text?,
   containsSpoilers, reviewedAt) + CHECK do rating à mão.
2. Domínio `rating.ts`: válido = 0,5–5,0 múltiplo de 0,5 (TDD).
3. `avaliacao.repository`: upsert por (userId, mediaId), leitura para a
   listagem da estante, remoção. Sempre userId.
4. `avaliacao.service`: salvar (valida rating no domínio; recusa vazio total),
   remover. DTO da estante ganha `avaliacao`.
5. `POST /api/v1/avaliacoes` (upsert por entradaId) e
   `DELETE /api/v1/avaliacoes/:entradaId`.
6. Tela: estrelas de meia em meia + resenha + spoiler no card da estante.

## Pendências

- Página da obra (futuro): avaliação migra para lá junto com a fonte.
- Perfil público / resenhas visíveis a outros: fase social (Follow).

## Referências

- Regra do rating no CLAUDE.md raiz (Domínio) e painel 06 do artifact.
