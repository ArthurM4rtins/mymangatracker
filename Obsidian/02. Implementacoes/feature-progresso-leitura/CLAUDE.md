# feature/progresso-leitura — Fase 2: progresso de leitura

## Objetivo

O coração do produto: registrar onde o usuário lê (fonte) e qual capítulo abriu
(progresso), tudo privado do dono. Sem extensão de navegador (Fase 6) — o
registro acontece quando o usuário abre o capítulo PELO app.

## Escopo

1. **Configurar fonte**: o usuário cola a URL do capítulo 1 da obra no site onde
   lê. O domínio `url-template` (já existe, com testes) deriva os candidatos a
   template. A tela mostra o link do capítulo 2 de cada candidato; o usuário
   confirma num clique → grava `ReadingSource` (`sourceHost`, `urlTemplate`,
   `isActive: true`, `confirmedAt`).
2. **Continuar leitura**: botão na entrada da estante. Resolve a URL do próximo
   capítulo pelo template, grava `ReadingProgress` (`chapter`, `resolvedUrl`,
   `openedAt`) e abre o site em nova aba. Também dá para abrir um capítulo
   específico (campo numérico) — capítulo decimal existe (57.5).
3. **Trocar de fonte**: desativa a ativa (`isActive: false`) e cria a nova.
   O histórico de progresso fica — progresso pertence à obra, não ao site
   (`readingSourceId` é `SetNull` de propósito).

## Regras que os testes travam (TDD antes de implementar)

- Progresso da obra = **maior** capítulo aberto, não o último nem contagem.
- Registrar abertura atualiza `ShelfEntry.progressChapter` para o maior
  capítulo — é a denormalização que a estante já mostra ("no cap. X").
  Abrir capítulo menor que o atual NÃO regride o progresso.
- Uma fonte ativa por (userId, mediaId) — índice único parcial já existe na
  migration da Fase 1. Trocar de fonte preserva o histórico.
- **Privacidade**: `ReadingSource` e `ReadingProgress` carregam `userId` em
  toda consulta. Fonte/progresso de outro usuário = não encontrado (mesma
  resposta de inexistente).
- Domínio novo `progresso`: resolver URL do template (`{chapter}` → número),
  decidir maior capítulo, próximo capítulo (floor(maior) + 1).

## Camadas (pipeline de commits)

1. teste + domínio `progresso.ts` (resolver URL, maior capítulo, próximo)
2. repositórios `reading-source.repository.ts` e `reading-progress.repository.ts`
   (+ teste de privacidade em test:db)
3. teste + serviços `fonte.service.ts` (derivar/confirmar/trocar) e
   `progresso.service.ts` (registrar abertura + atualizar estante, transação)
4. controllers: `POST /api/v1/fontes/candidatos` (deriva, não grava),
   `POST /api/v1/fontes` (confirma), `POST /api/v1/progresso` (registra
   abertura, devolve `resolvedUrl`), `GET` da fonte ativa embutido na listagem
   da estante (o DTO da entrada ganha `fonte` e `maiorCapitulo`)
5. tela: fluxo inteiro na **estante** (não existe página da obra ainda) —
   por entrada: sem fonte → "Configurar leitura"; com fonte → "Continuar
   cap. N" + campo para capítulo específico
6. sem migration nova — entidades nasceram na Fase 1

## Decisões tomadas

- Registro de abertura é server-side (o app resolve a URL e grava antes de
  devolver o link) — o client não manda URL pronta, só o número do capítulo.
  URL forjada pelo client não entra no histórico.
- `ShelfEntry.progressChapter` é atualizado na mesma transação do
  `ReadingProgress` quando a abertura avança o progresso. Desde a edição manual
  (#31) os dois PODEM divergir; o progresso atual é o MAIOR dos dois
  (`progressoAtual`, #61) — é dele que sai o próximo capítulo e é contra ele
  que se decide se a estante avança.
- Abrir em nova aba com `window.open` depois da resposta — o registro não
  depende do site de terceiro responder.

## Decisão 01/09 — fonte sem template (opção 1)

Sites como MangaFire (`/chapter/4745883`, id sequencial interno) e MangaDex
(`/chapter/<uuid>`) não carregam o NÚMERO do capítulo na URL — template
`{chapter}` não existe neles. Decidido com o usuário: **fallback de página da
obra**. Quando a derivação não encontra template, a fonte guarda a URL da
página da série; o botão vira "Abrir obra + registrar cap. N" — abre a página,
o usuário clica no capítulo lá, e o registro/progresso continuam idênticos.

- Discriminador é o próprio `urlTemplate`: com `{chapter}` = template, sem =
  página da obra. Sem migration; quem decide é o domínio (`tipoDaFonte`).
- Template com offset (id sequencial do MangaFire) foi descartado: capítulo
  .5 quebra a aritmética, re-upload fura a sequência, offset varia por obra.
- Adapter MangaDex via API oficial fica como possível passo 2; scraping nunca;
  extensão (Fase 6) é a solução definitiva para captura automática.

## Pendências

- ~~Aprovação do desenho~~ — aprovado em 01/09, com a regra do maior capítulo
  confirmada (releitura registra histórico, não regride progresso).
- Validar capítulo máximo? (`Media.chapters` quando existir — decidido: só
  aviso visual, não bloqueio; scanlation passa do "oficial").
- Página da obra (futuro) — quando existir, o fluxo de fonte migra para lá.
- Extensão (Fase 6): esboço da conversa em `esboco-extensao-fase-6.md`.

## Referências

- `src/server/domain/url-template.ts` + `tests/domain/url-template.test.ts`
- Schema: `ReadingSource`, `ReadingProgress` (índice parcial na migration
  `entidades_fase_1`)
- Invariante de privacidade: CLAUDE.md raiz, "Regras absolutas"
