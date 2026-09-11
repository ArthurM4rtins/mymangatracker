# Reset de leitura — o desfazer que a extensão não tinha

Issue #172. Desenho aberto em 08/09/2026 a partir do teste manual da #142 e da série #171 → #172 → #173. Reescrito no mesmo dia com a forma proposta pelo usuário. Aguardando aprovação.

## Objetivo

Hoje uma abertura registrada é permanente: o repositório de `ReadingProgress` só tem `create` e leituras, não há FK para `ShelfEntry`, não há exclusão de conta. Um registro errado **para cima** gruda — e desde a #170 estraga também o destino do "Continuar leitura", que usa o capítulo mais avançado.

Objetivo, em duas partes que se completam:

1. **A extensão só registra capítulo que avança.** Menor ou igual ao progresso não grava nada e diz por quê.
2. **O site tem um reset de leitura por obra.** Apaga o histórico daquela obra e zera o progresso, com confirmação numérica. Depois a pessoa marca o capítulo certo com o "marcar capítulo" que já existe.

O reset é o desfazer; "só maior" é o que torna o registro previsível — e o que a #173 (registro automático) precisa como regra.

## A regra que decide a forma

`progressoAtual` (`src/server/domain/progresso.ts:36`) é o **MAIOR** entre o marcado à mão (`ShelfEntry.progressChapter`) e o maior aberto no histórico. *"Nenhum dos lados regride o outro."*

Consequência para o reset: **apagar o histórico não basta**. Se a pessoa marcou 100 à mão em algum momento, o histórico vazio ainda deixa 100. O reset é UMA transação com dois efeitos: apaga as aberturas da obra e grava `progressChapter = null`. Padrão da transação: `registrarAberturaComProgresso` (`reading-progress.repository.ts:67`).

O status **não muda**: resetar não é abandonar.

## Custo aceito

O reset é mais grosso que "corrigir para N": apaga tudo, inclusive as aberturas abaixo do capítulo certo, e com elas o destino do "Continuar leitura" até o próximo registro pela extensão. Quem só queria tirar um capítulo errado do topo apaga dez linhas para consertar uma. Em troca, uma operação só, sem contagem por faixa, sem confirmação no popup. Decisão do usuário em 08/09/2026.

## Parte 1 — a extensão só registra o que avança

### Onde a regra mora

No **servidor**. O desenho da extensão (`feature-extensao-navegador/CLAUDE.md`) é explícito: *"ZERO regra de negócio aqui; quem decide se o progresso avança é o servidor"*. Se o filtro ficasse só no popup, a API continuaria aceitando releitura e a regra viveria em dois lugares.

`registrarLeituraExterna` passa a devolver `{ estado: "nao_avanca", progresso }` quando `capitulo <= progressoAtual`, **sem gravar**. O caminho `registrarReleitura` deixa de existir — nenhum outro cliente registra abertura (o site parou na #170), então releitura vira conceito morto e sai junto.

### O que muda de comportamento

Hoje: capítulo 2 com estante no 94 → grava a releitura, responde "cap. 2 registrado — estante segue no 94". Provado no teste 6 da bateria da #142.

Depois: mesma entrada → não grava, responde `nao_avanca`, e o popup mostra "sua estante já está no cap. 94 — para voltar, use o reset no site". O teste 6 inverte de sentido; o teste de serviço que fixava a releitura vira o teste do `nao_avanca`.

### Textos

Uma chave nova nos cinco `_locales` (`erroNaoAvanca` ou nome afim, com placeholder do progresso) e um código de erro novo na API (`NAO_AVANCA`) mapeado em `i18n.js` — o teste `tests/i18n/extensao.test.ts` cobra o mapa e as cinco pastas.

## Parte 2 — reset de leitura no site

### Onde

Na página da obra, ao lado do histórico (`obra/[anilistId]/page.tsx:392`, `HistoricoDeLeitura`): é onde a pessoa **vê** as aberturas que vão sumir. Só aparece quando há histórico ou progresso marcado — obra zerada não tem o que resetar.

### Confirmação

Modal do site, no padrão de `avaliacao-da-obra.tsx` (`role="dialog"`, `Esc` fecha, foco no Cancelar). O texto carrega os números: *"Isso apaga as 7 aberturas de Berserk e zera o progresso (hoje no cap. 94). Depois, marque o capítulo em que você está."* Confirmação sem número é confirmação no escuro.

Para o número, `MinhaRelacao` ganha `totalDeAberturas` — uma contagem a mais no `Promise.all` de `obraParaPagina`, porque o `historico` da página é limitado a 20 e não serve como total.

### Rota

`DELETE /api/v1/estante/[entradaId]/leituras`, sessão obrigatória. É um delete de verdade — do histórico da obra — e o recurso é da entrada da estante, que é do usuário. Responde `{ removidas }`. `entradaId` alheio ou inexistente → 404 `entrada_nao_encontrada`, igual às outras rotas.

### Depois do reset

O "Continuar leitura" some (sem abertura, sem destino — regra da #170). A pessoa marca o capítulo pelo "marcar capítulo" (`definirProgresso`, já existe) e o progresso passa a ser o marcado. O próximo registro pela extensão só entra se for maior que ele.

## Pipeline

Parte 1: teste do serviço (`nao_avanca` sem gravar; releitura some) → serviço → código de erro → extensão (`i18n.js` + `_locales` ×5).
Parte 2: teste do serviço (reset apaga só da obra e do usuário, zera `progressChapter`, devolve contagem) → repositório (contagem + transação) → serviço → controller → tela (modal, `messages` ×5) → anotar a decisão 10 da extensão.

Cada parte cabe num PR próprio; a 1 destrava a #173, a 2 é o desfazer.

## Pendências

1. **Ordem dos PRs.** Recomendação: **Parte 2 primeiro**. Tirar a releitura antes de existir o reset deixaria um intervalo em que registro errado para cima continua permanente — o problema original, só que sem nem a releitura como consolo.
2. **Reset também na estante (card)?** Recomendação: não. Só na página da obra, onde o histórico está visível. A estante ganha o link "ver histórico" se fizer falta.
3. **Registrar a inversão da decisão 10** em `feature-extensao-navegador/CLAUDE.md`: a condição ("só depois que existir o desfazer") é cumprida pela Parte 2. Entra no PR dela.

## Referências

- #172 (esta), #171 (feita), #173 (bloqueada pela Parte 2)
- `src/server/domain/progresso.ts:36` — `progressoAtual`, o MAX
- `src/server/repositories/reading-progress.repository.ts:67` — a transação de referência
- `src/server/services/leitura-externa.service.ts` — onde a releitura sai
- `src/app/(ui)/[locale]/obra/[anilistId]/page.tsx:392` — `HistoricoDeLeitura`
- `feature-extensao-navegador/CLAUDE.md`, decisão 10 — a condição que o reset cumpre
