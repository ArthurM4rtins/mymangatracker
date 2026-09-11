# Identidade visual — Folunio

## Objetivo

Definir a marca do site: nome, logo, paleta de cores e tipografia, e aplicar no layout base.

## Decisões tomadas

- **Nome do site: Folunio** (Folha + Universo). Decidido em 11/09/2026, no rebranding (#268).
  - Motivo: o nome anterior colidia dentro da própria categoria. O significado agora é
    construído, não literal — a marca precisa ensinar a palavra, e isso é custo de divulgação.
  - `folunio.com` e `folunio.app` sem registro e `@folunio` livre no X, verificados em
    10/09/2026 por volta de 20h11. Retrato daquele horário, não garantia — reconferir antes
    de registrar.
- **Nome anterior: Kidoku** (既読, "lido"), decidido em 31/08/2026 e trocado em 11/09.
  - A decisão de 31/08 registrava aqui que **nenhum tracker de leitura usava o nome**. Isso
    era **falso**: a pesquisa de 10/09 achou `kidoku.net` / `Rasukarusan/kidoku`, app de
    registro e análise de leitura — mesma categoria. A pesquisa da época só tinha achado
    jogos de sudoku.
  - Somado a isso, `@kidoku` estava em uso no X e no Instagram, e `kidoku.app`, `.com` e
    `.net` registrados. Histórico em `../../05. Divulgacao/rebrand-folunio.md`.
- Nome do repositório continua `mymangatracker` — marca do site é independente do repo.

## Escopo

- Conceito de logo (wordmark + símbolo)
- Paleta de cores (light + dark)
- Tipografia
- Aplicação no layout base (`src/app/(ui)/layout.tsx`, `globals.css`)

## Decisões de marca (31/08/2026)

- **Logo: Conceito 2 — double-check.** Dois vistos sobrepostos (primeiro na cor de acento,
  segundo na cor do texto) + wordmark "folunio". Componente em
  `src/app/(ui)/[locale]/componentes/logo.tsx`.
  - **Rebranding de 11/09/2026 (#268):** o símbolo não mudou. Mudou a palavra, redesenhada na
    mesma monolinha, e o glifo ao lado: **葉宙** (葉 folha, 宙 espaço aberto) no lugar do 既読,
    que era o kanji de "lido" e não sobrevivia à troca de nome. O pingo do i assumiu o acento.
  - Na lombada da estante o 既読 era **status**, não marca — ali entrou o double-check miúdo.
  - Desenho completo, com os descartados e a assinatura de folha e planeta:
    `identidade-folunio.html` (nesta pasta).
- **Cores: as 3 direções viram temas escolhíveis pelo usuário**, não uma paleta única:
  - `sumi` — claro (papel/tinta/vermelho carimbo)
  - `noturno` — escuro (índigo/âmbar)
  - `matcha` — meio-termo real: verde-oliva dim (fundo `#343a2f`), não outro tema claro.
    Correção de 31/08: a primeira versão era papel-claro e ficava igual ao sumi na tela.
  - Sem escolha salva, segue o sistema: claro → sumi, escuro → noturno.
- **Seletor de tema: três bolinhas-swatch de duas metades** (fundo à esquerda, acento à direita,
  cores do PRÓPRIO tema), anel no acento pro ativo. Histórico em duas decisões: em 31/08 as
  bolinhas sólidas viraram controle segmentado com texto porque lembravam o logo do Letterboxd
  (regra em `tasks/lessons.md`: não ecoar a estética deles); em 01/09, por pedido do usuário, a
  bolinha voltou como swatch funcional — o que está em `seletor-tema.tsx`. A regra continua
  valendo para cores/arranjo que imitem o logo do Letterboxd.
- **Tipografia:** Zen Kaku Gothic New (marca, `--font-marca`) + Instrument Sans (UI, `--font-ui`),
  via `next/font/google`.

## Implementação (feita, ainda não commitada)

- `globals.css`: tokens semânticos (`fundo`, `superficie`, `texto`, `texto-suave`, `borda`,
  `acento`, `acento-contraste`, `nota`) por tema via `data-theme` no `<html>`, expostos ao
  Tailwind com `@theme inline`.
- `layout.tsx`: metadata → Folunio, fontes, header com `Logo` + `SeletorTema`, script inline
  anti-flash que aplica o tema salvo antes do primeiro paint.
- `seletor-tema.tsx`: `useSyncExternalStore` observando `data-theme` (fonte de verdade é o DOM;
  escolha persiste em `localStorage["folunio-tema"]`). `setState` em effect e mutação de `dataset`
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
