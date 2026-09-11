# story-curation

Fonte de verdade da curadoria inicial de arcos e sagas.

## Objetivo

Construir uma base versionada e validável de estrutura narrativa para as primeiras 100 obras
mais populares do catálogo AniList compatíveis com o produto. Cada obra precisa resultar em um
registro importável, mesmo quando não há evidência suficiente para publicar arcos.

## Escopo

- Criar um contrato JSON para estruturas narrativas e um validador local.
- Gerar uma fila reproduzível de 100 obras a partir do AniList.
- Curar cada obra individualmente, guardando fontes, intervalos inclusivos, confiança e status.
- Não alterar o schema Prisma nem expor a funcionalidade na UI nesta etapa.

Fora do escopo:

- Migration e telas de `StorySegment`.
- Cadastro público de sugestões.
- Anime, filmes e live action.
- Copiar sinopses ou conteúdo protegido de fontes externas.

## Decisões tomadas

| Decisão | Valor | Motivo |
|---|---|---|
| Chave da obra | `anilistId` | identidade estável já usada no `Media` |
| Unidade inicial | `CHAPTER` | coincide com o tracking atual |
| Hierarquia | `SAGA` contém `ARC` por `parentKey` | evita tabelas duplicadas |
| Trecho sem arco | `INTERLUDE` explícito (03/09) | interlúdio ou capítulos avulsos que nenhuma fonte põe em arco viram segmento próprio; nem lacuna, nem limite inventado |
| Capítulo de fronteira | vai para um arco só, decidido por evidência do capítulo (infobox, título) | Solo Leveling 61 é Demon Castle; Ragnarok 7/13/20/84 abrem o round seguinte |
| Capítulos | strings decimais | preserva `57.5` sem perda de precisão JSON |
| Publicação | só `VERIFIED` é importável | rascunho não pode vazar como fato |
| Falta de fonte | `INSUFFICIENT_EVIDENCE` | cobertura não autoriza inventar limites |
| Persistência | um arquivo por obra + progresso da fila | interrupção perde no máximo a obra atual |

## Estados da curadoria

- `VERIFIED`: fonte oficial ou convergência suficiente entre fontes independentes.
- `DRAFT`: estrutura encontrada, mas ainda não revisada.
- `DISPUTED`: fontes confiáveis divergem em nome ou intervalo.
- `INSUFFICIENT_EVIDENCE`: não há prova bastante para publicar.
- `NOT_APPLICABLE`: obra curta/one-shot sem divisão narrativa útil.

## Critérios de evidência

1. Confirmar identidade e numeração da obra.
2. Preferir editora/autor/material oficial; depois referências enciclopédicas; por último wiki
   comunitária especializada.
3. Guardar URLs e data de acesso para cada limite publicado.
4. Registrar divergências explicitamente; nunca escolher em silêncio.
5. Intervalos são inclusivos. Arco ainda em publicação tem fim nulo.

## Arquivos previstos

```text
data/story-structures/
  schema.json
  catalog-snapshot.json
  progress.json
  titles/<anilistId>.json
  reports/batch-0001.md
```

## Validação

- JSON válido contra o contrato.
- `anilistId` único na fila.
- `parentKey` aponta para segmento existente e de tipo `SAGA`.
- `kind` é `SAGA`, `ARC` ou `INTERLUDE`; segmento sem `key`, `kind`, `title` ou `status` reprova.
- Irmãos (mesmo `parentKey`) não se sobrepõem nem deixam lacuna; lacuna real vira `INTERLUDE`.
- início não é negativo (capítulo 0 existe: Fire Force) e não passa do fim. Prólogo antes do 1 vai como decimal (Berserk 0.01–0.09, numeração do MangaDex); negativo de site editorial não entra.
- toda referência de fonte existe no documento.
- `VERIFIED` tem ao menos uma fonte por segmento.

## Pendências

- Confirmar o limiar objetivo entre `VERIFIED` e `DRAFT` a partir do piloto.
- Definir, antes da implementação no banco, como novels com capítulos reiniciados por volume
  serão representadas.

