# feature/pagina-obra — página da obra estilo Letterboxd

## Objetivo

`/obra/[anilistId]`: a casa de tudo sobre uma obra — sinopse completa, ano,
autor(es), gêneros, nota média do AniList, ações do usuário (estante, status,
avaliação, fonte, continuar) e obras similares. Fundação do roadmap aprovado
A→C→B→D→E (catálogo com filtros, reviews sociais, lists, página do autor).

## Decisões tomadas (01/09, aprovadas pelo usuário)

- Roadmap A→C→B→D→E aprovado; esta pasta é o bloco A.
- Reviews viram PÚBLICAS no bloco B (like + comentários) — confirmado.
  Progresso e fonte seguem 100% privados, invariante intocável.
- Autores no cache como coluna Json `authors` ([{anilistStaffId, nome, papel}]):
  tabela própria só quando a página do autor (bloco E) chegar — os dados vêm do
  AniList e recachear é barato. Papéis aceitos: os que contêm "Story" (Story,
  Story & Art, Original Story) e "Art" fica junto quando for a mesma pessoa.
- Similares = `recommendations` do AniList, buscadas ao vivo na página (sem
  cache no banco); AniList fora = seção some, página fica de pé.
- Cache `Media` ganha por migration aditiva: bannerImage, startYear, genres
  (String[]), averageScore, authors (Json). Tudo anulável — linhas velhas
  continuam válidas e são reidratadas pelo TTL de 24h normal.

## Escopo

1. Domínio `anilist-media`: campos novos no mapper (TDD nos casos novos).
2. Migration aditiva no `Media`.
3. Infra: queries BUSCA/POR_ID/POPULARES estendidas + query SIMILARES.
4. Repositório media: gravar/ler os campos novos.
5. Serviço `obra.service`: obra via cache TTL (mesma regra da estante),
   similares, e o recorte do usuário logado (entrada/avaliação/fonte).
6. Página `/obra/[anilistId]` + capas do catálogo/home viram links para ela.

## Pendências

- Bloco C: filtros do catálogo. Bloco B: reviews públicas + likes/comentários.
  Bloco D: lists. Bloco E: página do autor (usa anilistStaffId do Json).

## Referências

- Prints do Letterboxd na conversa de 01/09 (The Odyssey).
- `Obsidian/02. Implementacoes/feature-avaliacao/CLAUDE.md` (visibilidade).
