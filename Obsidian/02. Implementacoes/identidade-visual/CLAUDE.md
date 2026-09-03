# Identidade visual — Kidoku

## Objetivo

Definir a marca do site: nome, logo, paleta de cores e tipografia, e aplicar no layout base.

## Decisões tomadas

- **Nome do site: Kidoku** (既読, "lido" — o selo de mensagem visualizada). Decidido em 31/08/2026.
  - Motivo: o significado é o core do produto (marcar como lido), cobre resenha e tracking,
    curto e pronunciável em PT, e a origem do nome rende slide na apresentação.
  - Pesquisa de conflito feita em 31/08/2026: existe **Kidoku Live** (kidoku.app, sudoku
    multiplayer infantil) e um app iOS de sudoku com o mesmo nome. Nicho totalmente diferente,
    sem conflito de público. Nenhum tracker de leitura/manga usa o nome.
  - `kidoku.app` ocupado; alternativas futuras de domínio: `kidoku.moe`, `kidoku.social`,
    `kidoku.com.br` (disponibilidade não verificada).
- Nome do repositório continua `mymangatracker` — marca do site é independente do repo.

## Escopo

- Conceito de logo (wordmark + símbolo)
- Paleta de cores (light + dark)
- Tipografia
- Aplicação no layout base (`src/app/(ui)/layout.tsx`, `globals.css`)

## Decisões de marca (31/08/2026)

- **Logo: Conceito 2 — double-check.** Dois vistos sobrepostos (primeiro na cor de acento,
  segundo na cor do texto) + wordmark "kidoku". Componente em `src/app/(ui)/componentes/logo.tsx`.
- **Cores: as 3 direções viram temas escolhíveis pelo usuário**, não uma paleta única:
  - `sumi` — claro (papel/tinta/vermelho carimbo)
  - `noturno` — escuro (índigo/âmbar)
  - `matcha` — meio-termo real: verde-oliva dim (fundo `#343a2f`), não outro tema claro.
    Correção de 31/08: a primeira versão era papel-claro e ficava igual ao sumi na tela.
  - Sem escolha salva, segue o sistema: claro → sumi, escuro → noturno.
- **Seletor de tema: controle segmentado com texto** (Sumi · Noturno · Matcha), pill no acento
  pro ativo. Correção de 31/08: as três bolinhas coloridas lembravam o logo do Letterboxd —
  regra registrada em `tasks/lessons.md`: não ecoar a estética do Letterboxd.
- **Tipografia:** Zen Kaku Gothic New (marca, `--font-marca`) + Instrument Sans (UI, `--font-ui`),
  via `next/font/google`.

## Implementação (feita, ainda não commitada)

- `globals.css`: tokens semânticos (`fundo`, `superficie`, `texto`, `texto-suave`, `borda`,
  `acento`, `acento-contraste`, `nota`) por tema via `data-theme` no `<html>`, expostos ao
  Tailwind com `@theme inline`.
- `layout.tsx`: metadata → Kidoku, fontes, header com `Logo` + `SeletorTema`, script inline
  anti-flash que aplica o tema salvo antes do primeiro paint.
- `seletor-tema.tsx`: `useSyncExternalStore` observando `data-theme` (fonte de verdade é o DOM;
  escolha persiste em `localStorage["kidoku-tema"]`). `setState` em effect e mutação de `dataset`
  reprovam no lint do React Compiler — por isso `setAttribute` + store externo.
- Telas `/` e `/catalogo`: classes `neutral-*`/`dark:` migradas para os tokens.
- Provas: `pnpm lint` verde, `pnpm test` 43/43, `pnpm build` verde.

## Pendências

- [x] Conferir visualmente os 3 temas no `pnpm dev` (31/08 — screenshots ok)
- [ ] Reorganizar o front do `/catalogo` (pedido do usuário em 31/08 — layout atual é lista
  provisória do slice vertical; repensar grade, capas, hierarquia)
- [ ] Favicon com o double-check (substituir `favicon.ico` herdado do scaffold)
- [ ] Commits em `feature/identidade-visual` quando o usuário liberar o git

## Referências

- Benchmark: Letterboxd (social + resenha), MyAnimeList/AniList (catálogo)
- Propostas de logo e paleta: `propostas.html` (nesta pasta) —
  artifact: https://claude.ai/code/artifact/79ca3363-bbb0-42d1-8b66-8325eae18f47
  - Logos: 1. Hanko (carimbo 読) · 2. Double-check · 3. Shiori (marcador no painel)
  - Paletas: A. Sumi & Hanko (papel/tinta/vermelho) · B. Leitura noturna (índigo/âmbar) · C. Matcha & papel
- Estudo do nome no logo (02/09/2026): `estudo-fonte-nome-logo.html` (nesta pasta) —
  artifact: https://claude.ai/code/artifact/0d843f32-7288-465c-a463-60aca6e4e17c
  - Wordmarks desenhados em SVG no traço do check: A. check é o k · A2. check com a
    ponta pra baixo (esboço do Nicholas) · B. monolinha + ícone · C. cortado e inclinado ·
    D. com 既読 · E. oito fontes do Google. Em aberto: qual entra em `logo.tsx`.
  - Tipografia sugerida: Zen Kaku Gothic New (marca) + Instrument Sans (UI), via next/font
  - Recomendação do assistente: Conceito 1 + Direção A
