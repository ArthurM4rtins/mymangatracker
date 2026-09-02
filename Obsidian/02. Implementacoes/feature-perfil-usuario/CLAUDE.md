# feature/perfil-usuario — perfil público (#49)

## Objetivo

Username clicável em resenha, comentário e lista leva a `/u/:username`: a
página pública de quem lê. Abre caminho para Follow (fase social).

## Decisões tomadas (02/09)

- **Sem tabela nova, sem migration.** Tudo é agregado do que já existe.
- Recorte público = o mesmo do social (bloco B): username e data de cadastro.
  E-mail e ids de usuário NUNCA saem — travado em teste de repositório.
- **Progresso e fonte não aparecem** (invariante), para ninguém.
- **Perfil de OUTRO usuário mostra só o que a pessoa fez em cima de obras**:
  grade de avaliadas (capa + nota), resenhas recentes, listas, e os números
  (avaliadas · resenhas · listas · curtidas dadas) numa linha do header.
  Status da estante NÃO é público — nem em contagem.
- **Perfil do DONO** tem, além disso, o bloco "Minha estante": abas por
  status com contagem, capas e o capítulo atual embaixo (primeira vez que
  progresso aparece fora do `/estante`; aprovado pelo usuário em 02/09). O
  serviço só monta esse bloco quando `viewerId === dono` — teste de banco
  cobre o perfil de A visto por B: nenhum status nem capítulo serializado.
- **Grade de avaliadas é filtrável pela URL** (`?ordem=recentes|antigas|
  maior_nota|menor_nota&nota=4.5`), whitelist no domínio como o catálogo.
  Ordena/filtra em memória: o total de notas de uma pessoa é pequeno.
- Curtida é em resenha, não em obra: aparece só como número.
- Leitura server-side na página, **sem rota de API**. Inexistente = 404.
- Avatar: placeholder com a inicial do username. Upload fica para depois.
- Header: quando logado, link "Perfil" para o próprio `/u/:username`.
- Primeira versão (cards de contagem, estante por status pública) foi
  rejeitada pelo usuário com print: "mais bonito, fácil visualização,
  diferenciar meu perfil do de outro".

## Escopo

1. Domínio `perfil.ts` (TDD): contagem por status, whitelist e ordenação
   das avaliadas.
2. Repositório: `buscarUsuarioPorUsername` (sem e-mail), agregados em
   `perfil.repository.ts`, `listarListasDoUsuario` no `lista.repository`;
   estante do dono via `shelf.repository` existente.
3. Serviço `perfil.service.ts` (TDD): compõe; estante só para o dono.
4. Tela `/u/[username]` + links de username + link no header.
5. Teste de banco: recorte não vaza e-mail/id/progresso/status.

## Pendências

- Grade de "resenhas que curtiu" (hoje curtidas só como número).
- Avatar real, bio, Follow (#49 abre; feed é #50).

## Referências

- Issue #49. Visibilidade: feature-reviews-sociais/CLAUDE.md.
