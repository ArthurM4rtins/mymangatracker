# Corrigir progresso para trás — o desfazer que a extensão não tinha

Issue #172. Desenho aberto em 08/09/2026, a partir do teste manual da #142 e da série #171 → #172 → #173. Aguardando aprovação.

## Objetivo

Hoje uma abertura registrada é permanente: o repositório de `ReadingProgress` só tem `create` e leituras, `ReadingProgress` não tem FK para `ShelfEntry`, e não há exclusão de conta. Um registro errado **para cima** gruda — e desde a #170 estraga também o destino do "Continuar leitura", que usa o capítulo mais avançado.

Objetivo: a pessoa diz "na verdade estou no capítulo N" e o sistema volta para N, com uma confirmação que mostra o que vai ser apagado.

## A regra que decide a forma

`progressoAtual` (`src/server/domain/progresso.ts:36`) devolve o **MAIOR** entre o marcado à mão (`ShelfEntry.progressChapter`) e o maior aberto no histórico. O comentário é explícito: *"nenhum dos lados regride o outro"*.

Consequência: **apagar aberturas não basta**. Se a pessoa marcou 100 à mão em algum momento, apagar o histórico acima de 12 ainda deixa o progresso em 100. E o inverso também: baixar a marcação sem tocar no histórico deixa o 94 do histórico mandando.

Então "corrigir para N" é UMA operação com dois efeitos, na mesma transação:

1. apagar as aberturas desta obra e deste usuário com `chapter > N`;
2. gravar `progressChapter = N` quando o marcado atual for maior que N.

Nenhum dos dois sozinho corrige. A transação segue o padrão que já existe em `registrarAberturaComProgresso` (`reading-progress.repository.ts:67`): histórico e denormalização nunca divergem.

O status **não muda**: quem estava Lendo continua Lendo. Corrigir não é abandonar.

## Semântica fina

- `chapter > N` apaga; `chapter == N` fica. Corrigir para 12 mantém a abertura do 12 — foi lida.
- N ≥ progresso atual **não é correção**, é registro normal. O serviço recusa com um estado próprio (`nada_a_corrigir`) em vez de fingir que fez algo. O popup nem chama a correção nesse caso.
- Sem aberturas acima de N mas com marcado acima: a correção acontece só na marcação. Continua sendo "corrigir".
- A URL do "Continuar leitura" passa a ser a da abertura mais avançada que sobrou. Se nenhuma sobrou, o botão some — comportamento que a #170 já definiu.

## Escopo

Dentro:

- domínio puro que decide o plano da correção (o que apagar, se baixa a marcação, quantas linhas);
- repositório com contagem (prévia) e a transação (execução), ambas carregando `userId`;
- serviço com o caso de uso em duas fases: **prévia** e **execução**;
- controller: rota nova, sessão obrigatória;
- extensão: campo de capítulo aceita valor abaixo do progresso, e mostra a confirmação **dentro do popup** com a contagem;
- site: a mesma correção na página da obra, ao lado do histórico (`obra/[anilistId]/page.tsx:392`);
- textos nos cinco idiomas, nos DOIS catálogos (`messages/` e `extension/_locales/`).

Fora:

- apagar UMA abertura específica (só a linha errada, mantendo as de cima). É outra operação, com outra tela; não entra aqui;
- teto de requisições para a correção — é escrita autenticada como as outras, e o achado 6 (#136) trata todas juntas.

## Decisões propostas

### 1. Duas fases na MESMA rota, decididas pelo corpo

`POST /api/v1/leitura/correcao` com `{ entradaId, capitulo, confirmado: boolean }`.

- `confirmado: false` → **prévia**: responde `{ removeria, progressoAtual, progressoDepois }` e não escreve nada;
- `confirmado: true` → **executa** e responde `{ removidas, progresso }`.

Por que uma rota: a prévia e a execução fazem a mesma pergunta ao banco ("quantas acima de N?"), e o serviço decide o plano uma vez só — a fase é só se o plano é aplicado. Alternativa: `GET` de prévia + `DELETE`. Duas rotas para uma decisão, e `DELETE` com corpo é aceito mas mal servido por alguns clientes.

Por que `POST .../correcao` e não `DELETE /leitura`: a operação não é "apagar o recurso leitura", é "corrigir o progresso" — e ela também **escreve** (`progressChapter`). O nome diz o que faz.

### 2. A confirmação mostra número, não pergunta genérica

"Isso apaga **3** aberturas acima do capítulo **12** e leva a estante do **94** para o **12**. Confirmar?" — com os números vindos da prévia. Confirmação sem número é confirmação no escuro, e a pessoa clica sem ler.

Na extensão: **nunca `confirm()`** — trava o popup do MV3. É um bloco inline no popup, substituindo o botão "Registrar leitura" por "Corrigir para o cap. 12" + "Cancelar", com o foco no Cancelar.

### 3. Quando o popup oferece corrigir

Depende da Pendência 1. O popup já tem o progresso de cada entrada (é o "no cap. 94" da lista), então sabe sem ir ao servidor quando o número digitado é menor que o progresso.

### 4. Domínio puro decide o plano

```
planoDeCorrecao(alvo, aberturas: {id, chapter}[], marcado: number | null)
  → { apagar: id[], novoMarcado: number | null, progressoDepois: number } | "nada_a_corrigir"
```

Testável sem banco: capítulo igual fica, maior sai, marcado acima baixa, marcado abaixo fica, alvo acima de tudo é `nada_a_corrigir`, decimal ordena por valor.

### 5. Onde o serviço mora

Arquivo novo `correcao-de-progresso.service.ts`, não dentro de `leitura-externa.service.ts`: é outro caso de uso, com outras dependências (contar, apagar) e outro resultado. Mesmo padrão de `deps` injetadas.

## Pendências — precisam de decisão antes de implementar

### 1. Releitura ou correção: como a pessoa escolhe? (a que mais importa)

Hoje, número menor que o progresso = **releitura** ("abri o 12 de novo, estante segue no 94"). É comportamento correto e testado (teste 6 da bateria da #142). A correção precisa conviver com ele.

Opções:

- **(a) Perguntar toda vez que o número for menor.** O popup mostra dois botões: "só registrar a releitura" e "corrigir a estante para 12". Mais um clique em toda releitura, mas a pessoa nunca corrige sem querer nem relê sem querer.
- **(b) Corrigir só por um controle explícito.** Um link "corrigir progresso" ao lado do campo; o submit normal continua sendo registro/releitura. Zero mudança no fluxo de hoje, a correção é opt-in.
- **(c) Número menor sempre oferece correção, releitura some do popup.** Simplifica, mas mata a releitura pela extensão — e ela é o caso "reli o 12" que o teste 6 prova.

**Recomendação: (b).** Não mexe no que funciona, e correção é evento raro — não merece um passo a mais em toda releitura. O link só aparece quando o campo tem número menor que o progresso, para não poluir o caso comum.

### 2. O site também corrige nesta tarefa, ou fica para depois?

A issue lista o site. O ponto de encaixe é a página da obra, ao lado do histórico, onde a pessoa **vê** as aberturas que vão sumir — é o lugar mais honesto para a confirmação. Mas é tela nova, com modal (o padrão de `avaliacao-da-obra.tsx`), e dobra os textos.

**Recomendação: sim, nesta tarefa, por último.** Sem o site, quem não usa a extensão não corrige — e o site é onde o histórico aparece.

### 3. Aberturas apagadas somem do histórico ou ficam marcadas?

Apagar de verdade é o mais simples e é o que a issue diz. Alternativa: coluna `revogadaEm` e as consultas de progresso ignoram revogadas — mantém a trilha, custa migration e um `where` a mais em quatro consultas.

**Recomendação: apagar.** É a primeira exclusão de `ReadingProgress` do sistema, mas com confirmação numérica e sem migration. Se um dia precisar de trilha, é outra issue.

### 4. Registrar a inversão da decisão 10 da extensão

`Obsidian/02. Implementacoes/feature-extensao-navegador/CLAUDE.md`, decisão 10: *"Sem auto-registro enquanto não houver como desfazer."* Esta tarefa cria o desfazer. Anotar lá que a condição foi cumprida em #172, para a #173 partir do documento certo.

## Pipeline

teste de domínio (`planoDeCorrecao`) → domínio → repositório (contar, transação) → teste de serviço (prévia e execução, `userId` sempre) → serviço → controller → extensão (`_locales` ×5) → site (`messages` ×5) → anotar a decisão 10.

## Referências

- #172 (esta), #171 (feita), #173 (bloqueada por esta)
- `src/server/domain/progresso.ts:36` — `progressoAtual`, o MAX
- `src/server/repositories/reading-progress.repository.ts:67` — a transação de referência
- `extension/popup.js` — `submit`, onde a correção entra
- `src/app/(ui)/[locale]/obra/[anilistId]/page.tsx:392` — `HistoricoDeLeitura`
- Teste 6 da bateria da #142 (`tasks/todo.md`, sessão 08/09) — releitura não regride
