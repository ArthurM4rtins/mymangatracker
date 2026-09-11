# Continuar leitura — a extensão vira a única fonte do último link

Desenho aberto em 08/09/2026 a partir do teste manual da #142. **Aprovado em 08/09/2026.**

## Objetivo

Hoje o sistema tem **duas** verdades sobre "onde você lê":

- `ReadingSource` — colada à mão pelo usuário no "Trocar fonte", congelada no momento do cadastro;
- `ReadingProgress.resolvedUrl` — gravada pela extensão a cada registro, sempre a mais recente.

O botão "Abrir a obra" usa a primeira e ignora a segunda. Resultado observado com a conta
`Roca`: progresso no capítulo 94, e o botão abrindo o capítulo 2 — a URL que foi colada dias
antes. Não é dado ruim do usuário: é o fallback `paginaDaObra` (`fonte.service.ts:61`)
gravando a URL colada crua, porque em site de id opaco nenhum template deriva.

Objetivo: uma verdade só. O último link vem da extensão, e o botão passa a chamar
**"Continuar leitura"**, abrindo o último capítulo salvo.

## Escopo

Dentro:

- remover o fluxo "Trocar fonte" (tela, rotas, derivação de template);
- `ContinuarLeitura` passa a usar o `resolvedUrl` da última abertura;
- rótulo novo: "Abrir a obra" → "Continuar leitura", nos 5 idiomas;
- o que fazer quando não existe abertura nenhuma ainda.

Fora:

- mexer na extensão (ela já grava o que precisa);
- remover a tabela `ReadingSource` do schema (ver Pendência 2).

## O que sai

| Arquivo | Papel |
|---|---|
| `src/server/domain/url-template.ts` | derivação de candidatos a `{chapter}` |
| `tests/domain/url-template.test.ts` | teste da derivação |
| `src/server/services/fonte.service.ts` | `candidatosDeFonte`, `confirmarFonte` |
| `tests/services/fonte.service.test.ts` | teste do serviço |
| `src/app/api/v1/fontes/route.ts` | confirmar fonte |
| `src/app/api/v1/fontes/candidatos/route.ts` | derivar candidatos |
| `src/app/(ui)/[locale]/estante/configurar-fonte.tsx` | o formulário de colar link |
| `tipoDaFonte`, `urlDaLeitura`, `urlDaPagina` em `progresso.ts` | só fazem sentido com template |

Três telas consomem `ContinuarLeitura` e passam `tipoDaFonte`/`urlDaObra`: `estante/page.tsx:200`,
`obra/[anilistId]/page.tsx:390`, `page.tsx:396` (home).

## Decisões já tomadas (pelo usuário, 08/09/2026)

1. **Arrancar o "Trocar fonte" inteiro.** O motivo é empírico: dos 7 registros de
   `ReadingSource` no banco, só 2 têm `{chapter}` — e ambos são fixtures (`example.com`,
   `exemplo.test`). O único host real é `mangafire.to`, sem template. Os agregadores que o
   projeto usa (MangaFire, MangaDex) usam id opaco por capítulo, então o template nunca
   disparou para eles.
2. **O último link vem só da extensão.**
3. **O botão vira "Continuar leitura"** e abre o último capítulo salvo.

Custo aceito na decisão 1: em site que carrega o número na URL (vários scanlators PT-BR usam
`/capitulo-57`; Asura usa `-chapter-57`), hoje dá para digitar "capítulo 58" e abrir direto.
Isso morre — passa a ser sempre "voltar para a última página lida".

## Pendências — todas resolvidas na implementação (issue #170)

### 1. O registro pelo site morre junto? — RESOLVIDO: sim (opção **a**)

`POST /api/v1/progresso` (`progresso.service.ts:87-91`) respondia `sem_fonte` quando não havia
`ReadingSource`. Sem o "Trocar fonte", nenhuma fonte nova nasce e esse caminho pararia de
funcionar de qualquer jeito.

**Decisão do usuário (08/09/2026): a extensão passa a ser o único jeito de registrar leitura.**
Quem não instalar usa o site para estante, resenhas e avaliações — tracking exige a extensão.
A marcação manual do capítulo na estante (`ShelfEntry.progressChapter`, o "marcar capítulo")
**continua existindo**; some apenas o "Configurar leitura" / "Trocar fonte".

Consequência: `progresso.service.ts`, `POST /api/v1/progresso` e o teste do serviço saem junto.

### 2. A tabela `ReadingSource` fica? — RESOLVIDO: fica

`ReadingProgress.readingSourceId` é FK para ela, e a leitura da extensão já grava sem fonte
(`leitura-externa.service.ts`: "a leitura externa é justamente o caso sem fonte configurada").

Sem o "Trocar fonte", a tabela deixa de receber linhas novas mas continua com as antigas.
Proposta: **manter no schema nesta tarefa**, sem escrever nela, e avaliar a remoção numa issue
própria depois que ela estiver comprovadamente sem uso. Migration destrutiva com FK não entra
na mesma tarefa que a mudança de comportamento.

### 3. De onde sai o "lendo em mangafire.to"? — RESOLVIDO

Sai do host do próprio `resolvedUrl`, no serviço — uma verdade só, em vez de coluna à parte que
pode divergir. Virou parte da mesma linha do capítulo: "cap. 94 em mangadex.org".

### 4. Obra sem nenhuma abertura registrada — RESOLVIDO

Não há último link. O botão some, ou aparece desabilitado com uma explicação? Precisa de texto
novo nos 5 idiomas de qualquer forma.

**Recomendação:** o botão não aparece, e no lugar entra uma linha curta dizendo que registrar
pela extensão habilita o "Continuar leitura". Botão desabilitado sem explicação é pior que
ausência.

### 5. Dados legados — RESOLVIDO

As fontes já cadastradas continuam no banco. Elas somem da tela junto com o "Trocar fonte" —
nenhuma linha é apagada, nada quebra.

## Referências

- Bug que originou: teste manual da #142, sessão de 08/09/2026
- `Obsidian/02. Implementacoes/feature-extensao-navegador/CLAUDE.md` — o desenho da extensão
- #52 (servidor da extensão), #91 (cliente)

## Decisão tomada durante a implementação

**O destino é o capítulo MAIS AVANÇADO, não a abertura mais recente.** A primeira versão
ordenava por `openedAt`, e os dados reais da conta `Roca` mostraram o problema: 94 registrado no
MangaDex e depois 70 no MangaFire fariam o botão voltar para o 70. A regra passou a ser a mesma
que o progresso da estante já segue — o maior capítulo — com empate desempatado pela abertura
mais nova, que é o site onde a pessoa leu por último.

Provado com teste de banco (`tests/repositories/reading-progress.mais-avancada.test.ts`), porque
ordenação só se prova no banco: como texto, "9.5" viria depois de "57.5".

## Continua após esta tarefa

- #171 — casar o nome da obra do título da aba e pré-selecionar
- #172 — corrigir progresso para trás, apagando aberturas acima do capítulo escolhido
- #173 — registro automático, bloqueado pela #172
