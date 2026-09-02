# feature/perfil-usuario — perfil público (#49)

## Objetivo

Username clicável em resenha, comentário e lista leva a `/u/:username`: a
página pública de quem lê. Abre caminho para Follow (fase social).

## Decisões tomadas (02/09)

- **Sem tabela nova, sem migration.** Tudo é agregado do que já existe.
- Recorte público = o mesmo do social (bloco B): username e data de cadastro.
  E-mail e ids de usuário NUNCA saem — travado em teste de repositório.
- **Progresso e fonte não aparecem** (invariante). `ShelfEntry.progressChapter`
  também fica de fora: só contagens da estante por status, sem listar obras.
- Conteúdo: contagens (estante por status, avaliações com nota, listas),
  resenhas recentes (com texto, 5 mais novas, capa da obra, curtidas) e as
  listas do usuário (mesmo card de `/listas`).
- Leitura server-side na página, **sem rota de API** (nada de ação nesta
  issue). Usuário inexistente = 404.
- Avatar: placeholder com a inicial do username. Upload fica para depois.
- Header: quando logado, link "Perfil" para o próprio `/u/:username`.

## Escopo

1. Domínio `perfil.ts` (TDD): contagem por status com zeros preenchidos.
2. Repositório: `buscarUsuarioPorUsername` (sem e-mail), agregados em
   `perfil.repository.ts`, `listarListasDoUsuario` no `lista.repository`.
3. Serviço `perfil.service.ts` (TDD): compõe; inexistente = null.
4. Tela `/u/[username]` + links de username + link no header.
5. Teste de banco: recorte não vaza e-mail/id/progresso.

## Pendências

- Grade da estante pública (que obras, não só contagens) — decidir depois.
- Avatar real, bio, Follow (#49 abre; feed é #50).

## Referências

- Issue #49. Visibilidade: feature-reviews-sociais/CLAUDE.md.
