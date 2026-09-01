# feature/reviews-sociais — bloco B: resenhas públicas, like e comentários

## Objetivo

O social do Letterboxd na página da obra: resenhas dos usuários visíveis a
todos, curtir resenha e comentar em sequência (tipo chat).

## Decisões tomadas (01/09, aprovadas pelo usuário na conversa do roadmap)

- **Resenha com TEXTO vira pública** na página da obra. Nota sem texto conta só
  como nota do dono, não entra na lista social.
- Exposto de quem escreveu: **username, nada além** — e-mail nunca sai. É a
  primeira consulta do sistema sem `userId` no where; consciente e restrita a
  `Entry` com `review` não nulo. **Progresso e fonte seguem 100% privados** —
  a invariante não muda.
- Like: `ReviewLike`, um por (entryId, userId), toggle. Pode curtir a própria
  resenha (sem regra especial no MVP).
- Comentários: `ReviewComment`, sequência cronológica plana (chat), texto
  1–2000 com CHECK de não-vazio à mão. Apagar: só o próprio comentário.
- Ordenação das resenhas: mais curtidas primeiro, desempate pelas recentes.
- Leitura é server-side na página; API só para ações (curtir, comentar,
  apagar). Comentários renderizados no servidor dentro de details/summary.

## Escopo

1. Migration aditiva: ReviewLike + ReviewComment (FK Cascade nos dois lados,
   unique like, CHECK do texto) — provada quebrando.
2. Repositórios: listar resenhas públicas da obra (username + contagens +
   curtidaPorMim), alternar curtida, comentar, apagar próprio, listar
   comentários.
3. Serviços TDD: curtir exige sessão e resenha existente; comentar valida
   texto; remover só o próprio.
4. Rotas: POST /api/v1/reviews/:entryId/curtida (toggle),
   POST /api/v1/reviews/:entryId/comentarios, DELETE /api/v1/comentarios/:id.
5. Página da obra ganha a seção Resenhas.

## Pendências

- Perfil público do usuário (clicar no username) — junto do bloco E/social.
- Feed de atividade (home) — futuro.

## Referências

- Prints do Letterboxd (reviews com like/comentários) na conversa de 01/09.
- Visibilidade decidida em feature-avaliacao/CLAUDE.md, revogada aqui para
  resenhas com texto.
