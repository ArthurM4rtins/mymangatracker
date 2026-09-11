# Rebrand em avaliação: Folunio

Registrado em 10/09/2026, a pedido do usuário. **Ideia guardada, não é decisão.**

## A ideia

Trocar o nome do produto. O candidato é **Folunio**.

**Significado, na definição do usuário: Folha + Universo.**

Folha, de página — a unidade do que se lê aqui. Universo, do tanto que cabe: mangá, manhwa,
novel, resenha e comunidade. "Um universo para suas leituras."

Pronúncia em português: **fo-LÚ-nio**.

O significado é **construído**, não literal. Diferente de Kidoku (既読, "lido"), que já chegava
com o core do produto embutido. Folunio não tem essa vantagem — a marca precisa ensinar a
palavra. Isso é custo de divulgação, e divulgação é o recurso escasso de uma equipe de dois.

## Por que a troca está na mesa

A pesquisa de 10/09 (`redes-sociais/pesquisa-nome-kidoku-2026-09-10.md`, autoria do Codex)
achou o que a pesquisa de 31/08 não tinha achado:

- **Existe outro Kidoku na mesma categoria** — `kidoku.net` / `Rasukarusan/kidoku`, app de
  registro e análise de leitura. Isso **corrige** a premissa registrada em
  `../02. Implementacoes/identidade-visual/CLAUDE.md`, que afirmava não haver tracker de leitura
  usando o nome. Colisão de nome dentro da mesma categoria atrapalha busca e divulgação.
- `@kidoku` está em uso no X **e** no Instagram.
- `kidoku.app`, `.com` e `.net` registrados. Sobra `kidoku.com.br` (disponível) e `.moe`/`.social`.

Contra isso, Folunio aparece com campo limpo: `folunio.com` e `folunio.app` sem registro no
RDAP, `@folunio` não encontrado no X, nada no INPI para o radical. Tudo verificado em 10/09 por
volta de 20h11 — retrato daquele horário, não garantia.

## O trade-off, sem enfeite

| | Kidoku | Folunio |
|---|---|---|
| Significado | 既読, "lido" — é o produto | inventado; precisa ser construído |
| Handle | `@kidoku` tomado nos dois | `@folunio` livre no X |
| Domínio | só `.com.br` e `.moe`/`.social` | `.com` e `.app` livres |
| Colisão de categoria | **outro tracker de leitura** | nenhuma encontrada |

Kidoku paga em colisão o que ganha em significado. Folunio é o inverso.

## Custo da troca, se acontecer

Não é só trocar palavra. Medido em 10/09: o nome aparece em **29 arquivos** de `src/`,
`extension/` e `messages/`. Onde dói:

- `src/app/(ui)/componentes/logo.tsx` — wordmark e o 既読 do símbolo. **O 既読 morre com o nome**:
  é o kanji de "lido", não tem relação com Folunio.
- `eslint.config.mjs` — "Kidoku", "既読" na allowlist de `react/jsx-no-literals`.
- `kidoku_sessao` — nome do cookie de sessão. Trocar desloga todo mundo; manter é dívida com
  nome antigo. Não é bloqueio, é decisão.
- `extension/` — nome, `_locales` dos 5 idiomas, `KIDOKU` global em `comum.js`.
- **`nota-kidoku.tsx`** — nome de arquivo com a marca dentro: renomear arrasta os imports.
- `messages/*.json` nos 5 idiomas, README, metadata das telas.

Rebrand depois de conta aberta em rede social custa muito mais que antes. Se for trocar, é agora.

## Se a troca acontecer — o que o usuário confirmou em 10/09

**Logo novo e varredura total.** Não é trocar o wordmark e deixar o resto: onde estiver escrito
Kidoku, muda. O símbolo entra junto, porque o **既読** é o kanji de "lido" e não sobrevive à
troca de nome — o double-check pode sobreviver, o kanji não.

### As quatro armadilhas da varredura

Nenhuma delas é pega por find-and-replace cego:

1. **`kidoku-tema`** (`localStorage`) aparece em **dois** lugares: `seletor-tema.tsx:18` e o
   script anti-flash embutido em `layout.tsx:67`. Trocar um e esquecer o outro quebra o
   anti-flash em silêncio — a tela pisca no tema errado e nada reclama. E trocar a chave
   **reseta o tema de quem já escolheu**; migrar o valor antigo é opcional, esquecer não é.
2. **`kidoku_sessao`** (cookie) vive em `sessao.ts:13` **e** em `extension/comum.js:14`. Os dois
   mudam no mesmo commit ou a extensão para de achar a sessão. Trocar **desloga todo mundo** —
   hoje isso é quase de graça, com a base nova; depois de tração, não é.
3. **`eslint.config.mjs`** tem `"Kidoku"` e `"既読"` na allowlist de `react/jsx-no-literals`.
   Esquecer ali faz o lint aceitar texto solto com o nome novo, ou barrar o antigo — o portão
   deixa de cobrar o que existe pra cobrar.
4. **`messages/*.json` nos 5 idiomas** — e o teste de i18n cobra os catálogos um contra o outro.
   Chave que sair num idioma e ficar no outro quebra o CI, o que aqui é bom: o portão pega.

### Sequenciamento que importa

A extensão **ainda não foi publicada na Chrome Web Store** — está como pendência no
`extension/README.md`. Nome e identidade da listagem são difíceis de mudar depois de publicar.

Então a ordem é: **decidir o nome → rebrand → publicar a extensão**. Publicar antes obriga a
conviver com o nome velho na loja ou refazer a submissão.

Mesma lógica da rede social: rebrand antes de qualquer coisa pública ganhar tração.

## Estado — rebrand marcado para 11/09/2026

Usuário decidiu em 10/09, ao encerrar: **amanhã é o dia do rebranding.** Logo novo e varredura
total. O nome final ainda é a primeira coisa a fechar na sessão — Folunio é o candidato único
preservado, mas a escolha só se confirma amanhã.

- **Nada de conta em rede social nem compra de domínio antes disso.** A fase 1 do plano de
  divulgação (`redes-sociais/CLAUDE.md`) segue travada até o nome fechar.
- `redes-sociais/CLAUDE.md` registra na decisão 1 "nome é Kidoku, fechado". **Está vencido por
  este documento** — corrigir durante o rebrand, não antes, para não reescrever duas vezes.
- `../02. Implementacoes/identidade-visual/CLAUDE.md` registra em 31/08 que nenhum tracker de
  leitura usa o nome Kidoku. **É falso** (`kidoku.net`). Corrigir junto.

## Roteiro para amanhã

Ordem pensada para cada passo ser provável sozinho. Nada aqui está feito.

**0. Fechar o nome.** Sem isso o resto não começa. Se sair Folunio, seguir; se voltar a ser
Kidoku, o único trabalho é corrigir as duas premissas erradas acima e destravar a fase 1.

**1. Identidade visual.** Logo novo — o double-check pode sobreviver, o **既読 não**. Definir
símbolo, wordmark e se a paleta dos 3 temas (`sumi`, `noturno`, `matcha`) continua fazendo
sentido com o conceito de folha e universo. Isso é decisão de desenho, não de código.

**2. Varredura no código**, 29 arquivos, com as quatro armadilhas da seção acima:
`kidoku-tema` (dois lugares), `kidoku_sessao` (servidor + extensão, mesmo commit),
`eslint.config.mjs` (allowlist), `messages/*.json` (5 idiomas). Mais o rename de
`nota-kidoku.tsx` e os `_locales` da extensão.

**3. Documentação.** README, `identidade-visual/CLAUDE.md`, `redes-sociais/CLAUDE.md`,
`extension/README.md` e o desenho do PWA (#264, onde `manifest.ts` vai carregar `name`).

**4. Provas.** `pnpm lint`, `pnpm test`, `pnpm build`. E no navegador: trocar de tema (o
anti-flash é o que quebra em silêncio), entrar e sair (cookie novo), e a extensão achando a
sessão. Sem isso, não está feito.

**Commits atômicos**, como sempre: identidade ≠ varredura de código ≠ documentação. Branch
própria, nunca na `main`.

**Ainda não existe issue** para o rebrand — não criei porque o nome não está fechado. Abrir
amanhã, depois do passo 0.

## Referências

- `redes-sociais/pesquisa-nome-kidoku-2026-09-10.md` — pesquisa de domínio, handle e INPI (Codex)
- `../02. Implementacoes/identidade-visual/CLAUDE.md` — decisão do nome Kidoku em 31/08, com a
  premissa que a pesquisa de 10/09 corrigiu
- `redes-sociais/CLAUDE.md` — plano de divulgação, escrito todo como Kidoku
