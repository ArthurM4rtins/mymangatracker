# Estruturas narrativas (arcos e sagas)

Insumo de curadoria da issue #16: um JSON por obra, com sagas, arcos e
interlúdios e o intervalo de capítulos de cada um, com fontes.

## O que roda com isto hoje

- **Só teste.** `tests/domain/story-structure*.test.ts` passa o validador
  (`src/server/domain/story-structure.ts`) em todos os arquivos desta pasta e
  em `progress.json`: identidade obrigatória de cada segmento, contiguidade
  entre irmãos (sem lacuna, sem sobreposição, fim aberto só no último),
  capítulo `>= 0`. Roda no CI a cada PR.
- **Nada no runtime.** Nenhum arquivo em `src/` importa este diretório nem o
  validador fora dos testes; nada aqui entra no build da Vercel. A fase de
  banco e tela (arcos na página da obra) é a próxima etapa da #16 e ainda
  não tem desenho aprovado.
- `scripts/fetch-curation-catalog.mjs` monta a fila reproduzível de obras
  a partir do AniList. Também é ferramenta de curadoria, fora do build.

## Regras que o validador trava

- `kind`: `SAGA`, `ARC` ou `INTERLUDE` (trecho entre arcos vira segmento
  explícito, decisão de 03/09).
- `unit`: `CHAPTER`. Capítulo decimal existe (`57.5`); capítulo `0` e `0.01`
  são aceitos aqui (prólogos do MangaDex), mas a API de progresso ainda exige
  positivo — decidir quando a estrutura for para o banco.
- Números negativos são recusados (o tracker só registra positivo).

## Por que está aqui e não em `src/`

Registrado na auditoria (#65, item 30 → #115): é código sem consumidor de
produto. Fica documentado como insumo até a #16 ligar ao banco.
