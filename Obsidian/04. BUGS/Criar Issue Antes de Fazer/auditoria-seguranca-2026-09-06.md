# Auditoria de segurança — 06/09/2026

Varredura de `src/`, `prisma/`, `extension/`, `scripts/`, `tests/` e `.github/` em `main @ c02d89c`.
`src/generated/prisma/` foi tratado como código de fornecedor e não auditado.

Este arquivo é a fonte de verdade da auditoria. Cada achado tem issue própria; o
endurecimento ficou num guarda-chuva (#148), na forma da #65.

## Veredito

Pode continuar no ar. **Nada crítico nem alto.** Nenhum achado dá a um atacante anônimo leitura
direta de `ReadingSource`/`ReadingProgress` de outra pessoa por falha de consulta — a disciplina
de camadas e o `userId` em toda query se sustentam.

O que existe é um conjunto de médios: um caminho de CSRF no login que faz a vítima gravar o
próprio histórico de leitura na conta do atacante, um limitador de tentativas que não é atômico
e é resetável sob demanda, e um bloco de disponibilidade — proxy do AniList sem cache, consultas
públicas sem `take`, escritas autenticadas sem teto — que permite a uma máquina só degradar o
site inteiro de graça.

### Corrigir primeiro, nesta ordem

1. Guarda de origem e `Content-Type` em `POST /api/v1/sessao` — #131. Fecha o achado 1 sozinho.
2. Atomicidade em `verificarERegistrar` e tirar a chave de IP de `liberarLogin` — #132, #133.
3. Memoizar o AniList e pôr `take` nas leituras públicas — #134, #135.

## Índice

| # | Severidade | Achado | Issue |
|---|---|---|---|
| 1 | média | CSRF no login fixa a sessão da vítima na conta do atacante | #131 |
| 2 | média | Limitador conta antes de inserir, sem atomicidade — rajada paralela passa por login, cadastro e comentário | #132 |
| 3 | média | liberarLogin apaga o balde de IP inteiro, e não existe teto por conta | #133 |
| 4 | média | Páginas anônimas proxyam o AniList sem cache e sem teto — uma máquina só degrada o site inteiro | #134 |
| 5 | média | Leituras públicas sem take: perfil, obra, lista e avatar | #135 |
| 6 | média | Nenhuma escrita autenticada tem teto exceto comentário, e as linhas são permanentes | #136 |
| 7 | baixa | Sair não revoga: o JWT vale os 7 dias inteiros e o fallback Bearer o reproduz sem navegador | #137 |
| 8 | baixa | Comentário e curtida aceitos em Entry sem resenha ressurgem colados no texto novo do dono (derrota a purga do #112) | #138 |
| 9 | baixa | Sem frame-ancestors nem X-Frame-Options: clickjacking em apagar lista, seguir e sair | #139 |
| 10 | baixa | O 409 do cadastro confirma se um e-mail tem conta no Kidoku | #140 |
| 11 | baixa | ipDoPedido confia no primeiro x-forwarded-for: a chave do limitador é escolhida por quem ataca | #141 |
| 12 | baixa | A extensão envia a URL crua da aba ativa, que nunca é mostrada antes nem pode ser apagada depois | #142 |
| 13 | baixa | O anti-bump de reviewedAt (#111) cai em duas requisições | #143 |
| 14 | baixa | Uma conta ocupa a página /listas e o feed da home inteiros | #144 |
| 15 | baixa | ?q= repetido derruba /catalogo com 500 | #145 |
| 16 | baixa | PUT /listas/:id/ordem vira até 502 statements numa transação | #146 |
| 17 | baixa | docker-compose publica o Postgres em 0.0.0.0:5432 com credenciais no repositório público | #147 |
| — | endurecimento | 15 itens sem caminho de ataque vivo | #148 |

## Achados com caminho de ataque vivo

### 1. CSRF no login fixa a sessão da vítima na conta do atacante

**Severidade:** média · **Issue:** #131

`POST /api/v1/sessao` aceita o corpo sem checar `origin`, `sec-fetch-site`, `referer` ou `content-type`, e grava o cookie de sessão na mesma requisição.

O atacante registra uma conta normal e hospeda um form auto-submetido com `enctype="text/plain"` cujo corpo, decodificado, é `{"email":"toupeira@evil.tld","senha":"pw","z":"="}`. A chave de padding `z` passa porque `ESQUEMA_LOGIN` é um `z.object` puro, que descarta chave extra em vez de recusar. A vítima visita a página, o navegador faz um POST de navegação top-level, nenhum cookie é exigido (é o login, não autenticado), `sameSite: "lax"` não bloqueia, e a resposta 200 traz `Set-Cookie: kidoku_sessao=<JWT do atacante>`.

A partir daí toda estante, `ReadingSource` e `ReadingProgress` que a vítima gravar caem sob o `userId` do atacante — que lê tudo entrando na própria conta. Com a extensão instalada isso acontece sem nenhuma interação de UI: `extension/comum.js:101` relê o cookie fixado e o manda como Bearer.

**Onde**

- `src/app/api/v1/sessao/route.ts:29` — `corpo = await request.json();` sem guarda nenhuma
- `src/app/api/v1/sessao/route.ts:77` — `escreverSessaoNoCookie(resposta, sessao.token);`
- `src/app/api/v1/_shared/sessao.ts:25` — `sameSite: "lax"` é o único controle adjacente a CSRF no repositório
- `next.config.ts` vazio, sem `middleware.ts`, sem `vercel.json`

**Correção proposta**

Dois helpers em `src/app/api/v1/_shared/`, ambos na camada de controller — o serviço não é tocado.

```ts
// src/app/api/v1/_shared/origem.ts
export function mesmaOrigem(request: Request): boolean
{
  const sec = request.headers.get("sec-fetch-site");
  if (sec) { return sec === "same-origin" || sec === "none"; }
  const origem = request.headers.get("origin");
  return origem === null || origem === new URL(request.url).origin;
}
```

Chamar no topo do `POST` de `sessao/route.ts`, antes de `request.json()`, devolvendo 403 — idem em `usuarios/route.ts`.

Somar um `lerJson(request)` que devolve 415 quando `content-type` não começa com `application/json`: isso sozinho mata o vetor `enctype="text/plain"`, porque um form cross-site não consegue definir esse header e o app não envia `Access-Control-Allow-*`. Aplicar `lerJson` nos 14 `route.ts` que hoje fazem `await request.json()` na mão.

---

### 2. Limitador conta antes de inserir, sem atomicidade — rajada paralela passa por login, cadastro e comentário

**Severidade:** média · **Issue:** #132

`verificarERegistrar` decide primeiro e grava depois, sem transação e sem lock.

N requisições disparadas em paralelo contra `POST /api/v1/sessao` rodam o `aggregate` antes de qualquer `INSERT` irmão comitar, todas leem `total: 0`, todas passam `LOGIN_POR_PAR` (5/15min) e `LOGIN_POR_IP` (30/60min), e todas as N senhas são de fato verificadas. Depois da rajada os contadores bloqueiam, mas 15 minutos depois as linhas saem da janela e a rajada se repete: **N tentativas por janela em vez de 5**, contra senhas que o app só exige ter 8 caracteres (`usuarios/route.ts`, `z.string().min(8)`, sem checagem de complexidade nem de vazamento).

A mesma corrida derruba `CADASTRO_POR_IP` — criação em massa de contas, que é pré-condição de vários outros achados — e `COMENTARIOS_POR_USUARIO`.

**Onde**

- `src/server/services/limite.service.ts:43-51` — o `Promise.all` que só conta
- `src/server/services/limite.service.ts:68-70` — o `Promise.all` que só registra, sem nada entre os dois
- `src/server/repositories/auth-attempt.repository.ts:12-18` (SELECT) e `:23` (INSERT) — dois statements independentes
- `prisma/schema.prisma:79` — `model AuthAttempt` só tem PK em `id` e índice **não único** `(scope, key, createdAt)`; o banco não tem como serializar
- `src/server/domain/limite-de-tentativas.ts:27` — `if (tentativasNaJanela < regra.maximo || maisAntigaNaJanela === null)`: o leitor em corrida passa pelas duas disjunções

**Correção proposta**

Barato: inverter a ordem dentro de `verificarERegistrar` (`limite.service.ts:32-73`) — registrar **antes** de contar, para que a linha da própria requisição esteja visível a toda contagem posterior — e mudar `avaliarLimite` em `limite-de-tentativas.ts` para bloquear em `tentativasNaJanela > regra.maximo`. Efeito colateral desejável: requisição bloqueada passa a gravar linha, estendendo o bloqueio sob ataque.

Forte: `@@unique([scope, key])` com coluna contador e `INSERT ... ON CONFLICT DO UPDATE SET n = n + 1 RETURNING n` dentro de `$transaction` em `auth-attempt.repository.ts`. Também resolve o crescimento sem limite da tabela.

**TDD.** Teste em `tests/services/limite.service.test.ts` antes: N `verificarERegistrar` sob `Promise.all` contra um fake cujo `contar` só reflete `registrar` já resolvidos — no máximo `maximo` podem voltar `{ bloqueado: false }`.

---

### 3. liberarLogin apaga o balde de IP inteiro, e não existe teto por conta

**Severidade:** média · **Issue:** #133

De um IP, o atacante gasta 29 tentativas erradas espalhadas por 29 e-mails de vítimas — cada uma cai numa chave `par` distinta e sem disputa, mas todas queimam um slot da chave compartilhada `sha256(ip)` — e então entra na própria conta descartável.

O sucesso chama `liberarLogin`, que manda **as duas** chaves para `zerar` → `deleteMany({ where: { scope, key } })` sem filtro de `createdAt`: as 29 linhas das vítimas somem junto. O orçamento de 30/hora por IP volta a zero sob demanda, indefinidamente.

Independentemente disso, nenhuma regra é chaveada só por e-mail. Um atacante distribuindo uma tentativa por endereço de origem (botnet, pool de nuvem, /64 IPv6 rotativo) não encontra teto nenhum por conta, e não há lockout, desafio nem notificação em lugar algum.

**Onde**

- `src/server/services/limite.service.ts:101` — `return { par: chaveDeTentativa([ip, email]), ip: chaveDeTentativa([ip]) };` — não existe chave só de e-mail
- `src/server/services/limite.service.ts:123` — `return zerar({ escopo: "login", chaves: [par, ip] }, DEPS_DE_PRODUCAO);`
- `src/server/repositories/auth-attempt.repository.ts:29` — delete incondicional da chave inteira
- `src/app/api/v1/sessao/route.ts:74` — `await liberarLogin({ ip, email: analise.data.email });`, sem relação de posse com o tráfego apagado

**Correção proposta**

Duas edições em `limite.service.ts`.

1. Em `liberarLogin` (`:119`), passar só a chave do par: `zerar({ escopo: "login", chaves: [par] }, DEPS_DE_PRODUCAO)`. Entrar prova posse daquela conta e não diz nada sobre o resto do tráfego que compartilha o hash do IP.
2. Ao lado das regras em `:87-91`, `const LOGIN_POR_CONTA: RegraDeLimite = { maximo: 20, janelaMs: 60 * 60_000 };`, com `chavesDoLogin` devolvendo também `conta: chaveDeTentativa([email])` e `limitarLogin` incluindo essa chave — deixando-a **fora** da lista de `liberarLogin`.

**TDD.** Sucesso na conta A não pode apagar as linhas da conta B no mesmo IP.

Se o medo é lockout de NAT compartilhado (faculdade), subir `LOGIN_POR_IP.maximo` em `:88` — não deixar o balde resetável por quem ataca.

---

### 4. Páginas anônimas proxyam o AniList sem cache e sem teto — uma máquina só degrada o site inteiro

**Severidade:** média · **Issue:** #134

`GET /` já basta: a raiz é `force-dynamic` e chama `buscarNoCatalogo(interpretarFiltros({}))` em todo render, o que vira um `POST` real para `graphql.anilist.co` com `cache: "no-store"`, saindo do IP único do deploy. Variante que também derrota qualquer cache futuro: `GET /catalogo?q=<aleatório>`, onde o atacante escolhe a chave.

Algumas dezenas de requisições por minuto estouram a cota pública do AniList. A partir daí `chamar()` lança no array `errors` e, **para todo mundo**: `/` e `/catalogo` renderizam `estado: "indisponivel"`, `/autor/<id>` idem, `/obra/<id>` sem cache fresco idem, e `POST /api/v1/estante` devolve 503 para qualquer obra não cacheada — ninguém adiciona nada à estante. O estado persiste enquanto o gotejamento continuar.

Não autenticado, custo zero para o atacante.

**Onde**

- `src/server/infra/anilist.ts:274` — `cache: "no-store"`, a única linha de cache do arquivo
- `src/app/(ui)/page.tsx:28` `force-dynamic` e `:56` `buscarNoCatalogo(interpretarFiltros({})),`
- `src/app/(ui)/catalogo/page.tsx:13` e `:35`
- `src/server/services/estante.service.ts:92` → `src/app/api/v1/estante/route.ts:122` (503)
- `src/server/services/sistema.service.ts:23` — `lembrarPorTempo` existe e é usado **uma única vez** em todo o código

**Correção proposta**

Reusar o memo que o projeto já tem.

- Em `catalogo.service.ts`, envolver `buscarPopulares` com `lembrarPorTempo(buscarPopulares, 30_000)` de `@/server/domain/memoria-curta`. A query da vitrine é idêntica para todo visitante e é o que `/` e `/catalogo` sem filtro batem.
- Memo por id com TTL em `buscarSimilares` e `buscarAutor` — `autor.service.ts` documenta não ter cache nenhum.
- Para `buscarFiltrado`, onde `?q=` é chave escolhida pelo atacante, memo não resolve: orçamento por IP na busca do catálogo com `verificarERegistrar` num escopo novo, e limitar o termo em `interpretarFiltros` com `.slice(0, 100)`.
- Fechar também o `deps.salvarMedia` anônimo em `obra.service.ts:184`, para que caminhar por ids não insira linhas `Media` sem limite.

---

### 5. Leituras públicas sem take: perfil, obra, lista e avatar

**Severidade:** média · **Issue:** #135

Quatro caminhos públicos materializam conjuntos que o próprio atacante infla.

**Perfil.** `listarAvaliadas` e `listarListasDoUsuario` não têm `take`, e `SELECT_DO_CARD` carrega `_count` de itens e curtidas mais uma subquery correlacionada de `itens` por linha. `POST /api/v1/listas` não tem teto nenhum: dezenas de milhares de listas numa conta, link de `/u/<atacante>` compartilhado, e cada visita — crawler incluso — roda tudo e segura uma conexão Neon pelo tempo todo.

**Obra.** `listarReviewsDaObra` traz **todas** as resenhas da obra ordenadas por `{ likes: { _count: "desc" } }` — o agregado força a varredura completa antes de qualquer limite. Com N contas (via achado 2) e `review: z.string().max(20000)`, uma obra popular vira dezenas de MB por render anônimo, para sempre, até limpeza manual no banco. O `take` existe só na relação aninhada `comentarios`.

**Lista.** `buscarListaComItens` não tem `take` e roda **duas vezes por visita**, porque `generateMetadata` — que só precisa do `nome` — e o corpo da página chamam o mesmo loader sem `cache()` do React, ao contrário de `obra/[anilistId]/page.tsx` e `autor/[staffId]/page.tsx`, que envolvem. `adicionarItem` confere posse e `_max.position`, nunca tamanho.

**Avatar.** `GET /api/v1/usuarios/:username/avatar` é anônimo e sem teto, e lê o BYTEA de até 512 KB **antes** de decidir o 304: até revalidação de navegador bem-comportado custa a leitura inteira, e `new Uint8Array(foto.bytes)` é uma cópia.

**Onde**

- `src/server/repositories/perfil.repository.ts:37,39`
- `src/server/repositories/lista.repository.ts:67,127,129` · `:139,154` · `:344`
- `src/server/repositories/review-social.repository.ts:83-85` e `:105`
- `src/app/api/v1/avaliacoes/route.ts:15` — `review: z.string().max(20000)`
- `src/app/api/v1/usuarios/[username]/avatar/route.ts:20` (leitura), `:29` (304), `:34` (cópia)

**Correção proposta**

`take` + cursor nos quatro.

- `perfil.repository.ts` já tem o padrão certo em `listarResenhasRecentes(userId, limite)` — replicar em `listarAvaliadas` e `listarListasDoUsuario`, e mover `numeros.avaliadas`/`numeros.listas` em `perfil.service.ts` para `entry.count`/`list.count`.
- Em `listarReviewsDaObra`, primeira página de 10-20 com endpoint de load-more, seguindo `listarComentariosAnteriores` no mesmo arquivo. Se a ordenação por curtidas tiver de ficar, desnormalizar `likesCount` em `Entry` com índice.
- Em `listas/[id]/page.tsx`, envolver o loader com `cache()` ou dar a `generateMetadata` uma função fina que só seleciona `{ nome: true }`. Limitar itens por lista em `adicionarItem`, alinhado aos 500 que `listas/[id]/ordem/route.ts:13` já assume.
- No avatar, quebrar a leitura: `buscarVersaoDoAvatar(username)` selecionando só `avatarUpdatedAt`, resolver 404/304 com isso, e só então buscar os bytes.

Dá para quebrar em quatro commits, um por caminho.

---

### 6. Nenhuma escrita autenticada tem teto exceto comentário, e as linhas são permanentes

**Severidade:** média · **Issue:** #136

O censo é curto: os únicos pontos de chamada de limitador em todo o repositório são `sessao/route.ts:54,74`, `usuarios/route.ts:58` e `review-social.service.ts:140`.

`POST /api/v1/leitura` insere uma linha `ReadingProgress` de ~2 KB por chamada — `url` aceita até 2048 caracteres — sem dedupe, sem constraint única e, verificado, **sem nenhum caminho de delete em todo o `src/`**. Capítulo 1 nunca progride a estante, então toda chamada cai em `registrarReleitura` e só acumula.

`PUT /api/v1/perfil/avatar` reescreve 512 KB numa coluna TOASTed a cada chamada, gerando WAL e tupla morta na tabela `User` que toda página lê. `POST /api/v1/listas`, `/listas/:id/itens` e `/estante` idem.

Sustentado, isso enche a cota do Neon e todo `INSERT` do app falha para todos os usuários. O próprio repositório já classificou esta forma como vulnerabilidade em `limite.service.ts:90`: *"Comentário (#109): escrita autenticada sem teto era negação de serviço barata."*

**Onde**

- `src/app/api/v1/leitura/route.ts:29-31` — sessão, e o próximo statement já é o parse do corpo
- `src/server/repositories/reading-progress.repository.ts:45,74` — `readingProgress.create`, e nenhum delete no arquivo
- `prisma/schema.prisma:307` — `model ReadingProgress`, índice `(userId, mediaId, openedAt desc)`, **não** único
- `src/app/api/v1/perfil/avatar/route.ts:42` — `new Uint8Array(await request.arrayBuffer())`
- `src/server/services/limite.service.ts:87-91` — as quatro regras existentes, para três endpoints

**Correção proposta**

Aplicar o padrão do #109 literalmente, e **na camada de serviço**, não no controller — o `CLAUDE.md` diz que controller nunca contém regra de negócio, e o limitador de comentário mora em `review-social.service.ts:140`, não na rota.

Em `limite.service.ts`, ao lado de `COMENTARIOS_POR_USUARIO`, acrescentar `LEITURA_POR_USUARIO` (~60/h), `AVATAR_POR_USUARIO` (dígito único/h) e `LISTA_POR_USUARIO`, com composers `limitar*` chaveados em `chaveDeTentativa([userId])`. Injetar cada um nas `Dependencias*` do serviço correspondente (`leitura-externa.service.ts`, `avatar.service.ts`, `lista.service.ts`), devolvendo um estado `"limitado"` que o controller mapeia para 429 com `Retry-After`, como `sessao/route.ts:56-62` já faz.

**Depende do achado 2** — sem atomicidade os limitadores novos herdam a mesma corrida.

À parte, issue própria: dar caminho de delete a `ReadingProgress` (`removerAbertura(userId, id)` com `userId` no where, mais serviço e controller DELETE) e podar por `(userId, mediaId)` além do que a UI mostra.

---

### 7. Sair não revoga: o JWT vale os 7 dias inteiros e o fallback Bearer o reproduz sem navegador

**Severidade:** baixa · **Issue:** #137

Notebook emprestado, ou qualquer código com acesso ao pote de cookies — uma segunda extensão com a permissão `cookies` faz exatamente o que `extension/comum.js:101` faz. Copiado o valor de `kidoku_sessao` uma vez, a vítima clica em "Sair", o cookie some do navegador dela e ela acredita razoavelmente que acabou.

Pelo resto dos 7 dias originais aquela string ainda autentica de qualquer lugar sem navegador: `curl -H "Authorization: Bearer <token>" .../api/v1/estante` devolve a estante privada inteira com progresso por obra e fonte ativa, e `POST /api/v1/leitura` escreve histórico na conta. Como não existe fluxo de troca nem de reset de senha em lugar nenhum do código, nada que a vítima faça pela UI interrompe isso.

Agravante de escopo: o Bearer vale em **todas** as 19 rotas autenticadas e 8 páginas, não só nas duas que a extensão usa.

**Onde**

- `src/app/api/v1/sessao/route.ts:92-98` — o DELETE só apaga o cookie
- `src/server/infra/sessao.ts:11` (`7 * 24 * 60 * 60`), `:28-33` (payload só com `sub`, sem `jti` nem versão), `:43-49` (`jwtVerify` puro, nenhum registro consultado)
- `src/app/api/v1/_shared/sessao.ts:78` — `?? (await tokenDoHeader())`
- `prisma/schema.prisma:43` — `model User` sem `tokenVersion`, sem tabela de sessão

**Correção proposta**

**Precisa de desenho antes de implementar** — mexe em lógica de sessão que já existe e cruza a fronteira de camadas.

Dar ao token algo revogável para apontar: `tokenVersion Int @default(0)` em `model User`, incluir no payload de `assinarSessao` (`infra/sessao.ts:28`) e comparar depois de `verificarSessao` dentro de `usuarioDaSessao` **através de um serviço que lê um repositório** — a comparação não pode morar em `infra/`, pelas regras de camada. `DELETE /api/v1/sessao` incrementa, o que também dá revogação de graça a um futuro fluxo de troca de senha.

Em paralelo, estreitar a superfície: `usuarioDaSessao({ aceitarBearer: true })` com default `false`, passado só em `estante/route.ts` e `leitura/route.ts`, que são as duas rotas que `extension/popup.js` chama.

Decisão em aberto: cortar `DURACAO_SESSAO_SEGUNDOS` de 7 dias para quanto. É o que transforma uma captura única em uma semana de acesso.

---

### 8. Comentário e curtida aceitos em Entry sem resenha ressurgem colados no texto novo do dono (derrota a purga do #112)

**Severidade:** baixa · **Issue:** #138

Mallory abre `/obra/[anilistId]` enquanto a resenha de Alice está pública e guarda `E = review.entryId`, que a página entrega ao navegador. Alice depois limpa só o texto e mantém a nota — fluxo suportado, `avaliacao.service.ts` aceita `rating != null` com `review == null`: a branch `textoApagado` purga curtidas e comentários e faz `update` **na mesma linha**, mesmo id, `review` agora NULL.

Mallory então manda `POST /api/v1/reviews/E/comentarios` e `.../curtida` de quantas contas quiser: os dois respondem 201/200 porque a FK resolve e nenhuma camada olha `Entry.review`.

Quando Alice escreve uma resenha nova, o `upsert` reusa a linha E pela branch `resenhaNasceu`, que **não purga nada** — o texto novo dela nasce publicado já carregando os comentários de Mallory e uma contagem de curtidas inflada, que ainda a sobe no `orderBy` de curtidas da página da obra.

A intenção violada está escrita no próprio projeto, em `tests/repositories/avaliacao.privacy.test.ts:142-144`: *"senao ele ressurgia colado num texto novo e diferente"*.

**Onde**

- `src/server/repositories/review-social.repository.ts:216` (`reviewComment.create`, só trata P2003) e `:173,180` (`alternarCurtida`) — nenhum dos dois lê `Entry.review`
- `src/server/repositories/avaliacao.repository.ts:48,53-54` — a purga, que é única
- `src/server/repositories/avaliacao.repository.ts:64` — `update: resenhaNasceu ? { ...campos, reviewedAt: new Date() } : campos,` — sem delete
- `tests/repositories/avaliacao.privacy.test.ts:142-144`

**Correção proposta**

**(a) Fechar no renascimento** — mais barato e suficiente para a vítima. Em `salvarAvaliacao`, dar ao caso `resenhaNasceu` a mesma forma transacional de `textoApagado`:

```ts
if (resenhaNasceu)
{
  const [, , atualizada] = await prisma.$transaction([
    prisma.reviewLike.deleteMany({ where: { entryId: existente.id } }),
    prisma.reviewComment.deleteMany({ where: { entryId: existente.id } }),
    prisma.entry.update({
      where: chave,
      data: { ...campos, reviewedAt: new Date() },
      select: { id: true },
    }),
  ]);
  return atualizada;
}
```

**(b) Recusar a escrita**, para os endpoints pararem de mentir com 201/200: em `comentarNaReview` e `alternarCurtida`, buscar o alvo antes — `findFirst({ where: { id: entryId, review: { not: null } }, select: { id: true } })` — devolvendo `null` no contrato que já existe, para as rotas responderem o 404 "resenha não encontrada" que já têm. Manter os catches de P2002/P2003: a busca não é atômica.

Regressão junto ao bloco do #112 existente.

---

### 9. Sem frame-ancestors nem X-Frame-Options: clickjacking em apagar lista, seguir e sair

**Severidade:** baixa · **Issue:** #139

`/listas` é pública e entrega `listaId` + `username` de todo mundo — `listarListasPublicas` não tem `where`.

O atacante enquadra `/listas/<listaId da vítima>` com opacidade ~0 e posiciona o botão "Apagar lista", renderizado exatamente quando a vítima logada é a dona, sob um chamariz; dois cliques comuns — o componente tem confirmação em dois passos — e o `DELETE /api/v1/listas/:id` destrói a lista. O botão "remover" precisa de **um** clique e não tem confirmação nenhuma.

Variante social: enquadrar `/u/<atacante>` e pôr "Seguir" sob o chamariz. Ou o `BotaoSair` em qualquer página — um clique, e a vítima é deslogada.

É UI redressing só de escrita: não permite ler o conteúdo enquadrado.

**Onde**

- `next.config.ts:3-5` — `NextConfig` vazio; zero ocorrências de `Content-Security-Policy|X-Frame-Options|frame-ancestors|X-Content-Type-Options|Referrer-Policy` fora de código gerado
- `src/server/repositories/lista.repository.ts:114-119` — `list.findMany` sem `where`, com `id` e `user.username` no select
- `src/app/(ui)/listas/[id]/page.tsx:83` — `{lista.minha && <ApagarLista listaId={lista.listaId} />}`
- `src/app/(ui)/listas/[id]/acoes-da-lista.tsx:43` → `:28` — DELETE de item, um clique, sem confirmação
- `src/app/(ui)/componentes/botao-sair.tsx:30` → `:17`

**Correção proposta**

Um bloco `headers()` no `nextConfig` cobrindo `"/(.*)"`:

```ts
async headers()
{
  return [{
    source: "/(.*)",
    headers: [
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "X-Frame-Options",         value: "DENY" },
      { key: "X-Content-Type-Options",  value: "nosniff" },
      { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
    ],
  }];
}
```

O app nunca se auto-embute, então nada quebra — e o `nosniff` daqui já fecha o gadget de script do avatar (item de endurecimento).

Reforço barato no mesmo commit: dar a `RemoverDaLista` o mesmo estado de confirmação em dois passos que `ApagarLista` já tem.

---

### 10. O 409 do cadastro confirma se um e-mail tem conta no Kidoku

**Severidade:** baixa · **Issue:** #140

`POST /api/v1/usuarios` com um username descartável:

- 409 com a chave `email` → o endereço está registrado
- 409 com a chave `username` → só o descartável colidiu
- 201 → o e-mail não está registrado (e deixa uma conta lixo)

O fluxo de login fecha deliberadamente esse mesmo oráculo: `HASH_FANTASMA` faz o scrypt correr igual para e-mail inexistente e a resposta 401 é uma só. O cadastro reabre. O comentário da própria rota afirma que o #113 morre ali, e ele só é medido (5 sondagens/hora/IP), não fechado.

**Onde**

- `src/app/api/v1/usuarios/route.ts:73-79`, em especial `:76` — `{ erros: { [erro.campo]: "já está em uso" } }` com status 409
- `src/server/repositories/usuario.repository.ts:154-158` — `email` é a branch default do match no `meta` do P2002
- `src/app/api/v1/usuarios/route.ts:57` — *"enumeração de e-mail por 409 (#113) param aqui"*

**Correção proposta**

No `catch` de `usuarios/route.ts:73-79`, manter a mensagem útil só para o identificador público e colapsar o privado — username já é público em `/u/<username>`, e-mail não é:

```ts
return NextResponse.json(
  { erros: erro.campo === "username"
      ? { username: "já está em uso" }
      : { _geral: "não foi possível concluir o cadastro agora" } },
  { status: erro.campo === "username" ? 409 : 500 },
);
```

**Decisão em aberto:** perde-se a mensagem amigável "esse e-mail já tem conta". Se a equipe preferir manter, registrar em `CLAUDE.md` como tradeoff aceito de enumeração, em vez de deixar o comentário da rota afirmando que o #113 foi fechado ali.

Achados 2 e 11 antes: o medidor é o que segura a vazão.

---

### 11. ipDoPedido confia no primeiro x-forwarded-for: a chave do limitador é escolhida por quem ataca

**Severidade:** baixa · **Issue:** #141

Cada tentativa vai com um header forjado diferente: `chaveDeTentativa([ip, email])` e `chaveDeTentativa([ip])` hasheiam strings novas, `contarTentativas` sempre devolve 0, e os tetos de 5/15min e 30/60min viram no-op — tentativas ilimitadas contra a conta. O mesmo truque zera `CADASTRO_POR_IP` e transforma o oráculo do achado 10 num verificador de endereços sem medidor.

Variante de negação: mandar 5 logins falhos com `X-Forwarded-For: <IP da vítima>` e o e-mail dela para travá-la por 15 minutos.

Cada requisição também compra um scrypt N=16384 (~16 MiB) mesmo para e-mail inexistente, que é exatamente o custo que o comentário da rota diz que o limite protege.

**Não verificável pelo repositório:** se a borda de produção **substitui** ou **anexa** o `x-forwarded-for`. A documentação da Vercel trata esse header como o IP do cliente, o que sugere substituição — nesse caso não há ataque no site publicado e isto vira endurecimento. Explorável em `pnpm start`, self-host ou CDN que anexa.

**Onde**

- `src/app/api/v1/_shared/ip.ts:14` — `const primeiro = encadeado.split(",")[0]?.trim();`, sem contagem de hops, sem `net.isIP`, com fallback para o também forjável `x-real-ip` (`:22`)
- `src/server/services/limite.service.ts:101` — as duas chaves derivam desse valor
- `src/server/domain/limite-de-tentativas.ts:47` — SHA-256 puro: qualquer string distinta é um balde novo e vazio
- `src/app/api/v1/sessao/route.ts:53-54` — o limite roda antes do scrypt, como o próprio comentário diz

**Correção proposta**

Em `ipDoPedido`: ler primeiro o header que a plataforma controla (`x-vercel-forwarded-for`), tratar `x-forwarded-for` só como fallback lido da **direita** (`partes[partes.length - 1]`) após descontar uma contagem configurada de hops, validar com `net.isIP`, e cair em `"desconhecido"` em vez de chavear numa string arbitrária.

**TDD.** Teste novo alimentando `X-Forwarded-For: 1.2.3.4, <real>` e afirmando que o valor forjado da esquerda não é devolvido. Hoje nada fixa esse comportamento.

Primeiro passo antes de implementar: confirmar o comportamento real da borda da Vercel com uma requisição que mande um XFF forjado contra o deploy e devolva o valor visto. Se substitui, esta issue é endurecimento e não urgência.

---

### 12. A extensão envia a URL crua da aba ativa, que nunca é mostrada antes nem pode ser apagada depois

**Severidade:** baixa · **Issue:** #142

A vítima tem uma aba aberta numa URL com segredo na query — `?token=` de reset, `?code=` de OAuth, link pré-assinado, painel interno com session id. Com essa aba ativa ela abre o popup do Kidoku, escolhe uma obra, digita o capítulo e clica em Registrar.

`popup.js:181` manda aquela string exata. `normalizarUrlVisitada` a aceita — é https, cabe em 2048, sem userinfo — e ela é gravada literalmente em `ReadingProgress.resolvedUrl`, no banco de produção.

A vítima nunca viu a string: o popup mostrou o **título** da aba. Depois não há como remover — o repositório só expõe create/findFirst/findMany/aggregate, `ReadingProgress` não tem FK para `ShelfEntry` (tirar a obra da estante não apaga a linha) e não existe rota de exclusão de conta.

Autoinfligida, sem atacante remoto. Mas o dado é privado e permanente, e é exatamente a classe que o `CLAUDE.md` trata como invariante.

**Onde**

- `extension/popup.js:181` — `body: JSON.stringify({ entradaId, capitulo, url: contexto.aba.url }),`
- `extension/popup.js:119-120` — `textContent` recebe o título; a URL vai só para o `title=` (tooltip)
- `src/server/domain/url-visitada.ts:55` — `return url.toString();` — search e hash preservados, fixado por `tests/domain/url-visitada.test.ts:24-28`
- `src/app/(ui)/obra/[anilistId]/page.tsx:392` — `href={abertura.url}`

**Correção proposta**

**(a)** Em `iniciar()` (`popup.js:119-120`), renderizar a URL como texto visível — `el.pagina.textContent` com `aba.url` truncada, título como secundário — para que a string que vai sair do navegador esteja na tela antes do clique.

**(b)** Em `normalizarUrlVisitada`, descartar o fragmento antes de devolver (`url.hash = ""; return url.toString();`). Custa nada, e o próprio projeto já registra em `fonte.service.ts` que o hash é posição na página, não identidade. A query fica pelo motivo documentado. Teste ao lado do existente.

**Decisão em aberto:** descartar também a query resolveria o caso do `?token=`, mas quebra a identificação de capítulo em site que usa `?c=57`. Provavelmente não dá — por isso (a) é a parte que importa.

À parte, issue própria: caminho de delete para `ReadingProgress` (ver achado 6).

---

### 13. O anti-bump de reviewedAt (#111) cai em duas requisições

**Severidade:** baixa · **Issue:** #143

Duas chamadas ao mesmo endpoint:

1. `POST /api/v1/avaliacoes {"anilistId":N,"rating":5,"review":null}` limpa o texto.
2. `POST /api/v1/avaliacoes {"anilistId":N,"rating":5,"review":"<mesmo texto>"}` cai em `resenhaNasceu` e carimba `reviewedAt = new Date()`.

A linha vira a mais nova entre as `review: { not: null }` e ocupa o slot 1 do feed anônimo da home. Sem limitador nenhum na rota, isso é repetível para sempre.

O que o guarda ainda compra: o passo 1 apaga curtidas e comentários daquela resenha na mesma transação, então o bypass não é grátis para quem tem prova social a perder — é grátis exatamente para spam, que é o caso que importa.

Gaming de feed público, sem exposição de dado.

**Onde**

- `src/server/repositories/avaliacao.repository.ts:64` — `update: resenhaNasceu ? { ...campos, reviewedAt: new Date() } : campos,`
- `src/server/repositories/atividade.repository.ts:69-72` — `where: { review: { not: null } }, orderBy: { reviewedAt: "desc" }, take: limite`
- `src/app/api/v1/avaliacoes/route.ts` — importa só `salvarAvaliacaoDoSistema` e `usuarioDaSessao`

**Correção proposta**

Carimbar a coluna de ordenação uma vez só: um `publishedAt` gravado na primeira transição null→texto e nunca recarimbado, com o feed ordenando por ele. Migration + backfill a partir de `reviewedAt`.

Paliativo mais barato, se a migration não valer agora: `limitarAvaliacao({ userId })` no serviço de avaliação, na forma de `limitarComentario` (achado 6).

Revisita a decisão do #111 — vale confirmar com quem a fechou antes de mexer.

---

### 14. Uma conta ocupa a página /listas e o feed da home inteiros

**Severidade:** baixa · **Issue:** #144

30 requisições a `POST /api/v1/listas` e os 30 cards da visão padrão de `/listas` são do atacante, porque `listarListasPublicas` não tem `where` e ordena por `createdAt desc` com `take: limite`. Repostar de tempos em tempos mantém assim.

Para a home, 12 obras na estante e 12 `POST /api/v1/avaliacoes` com texto tomam o trilho da vitrine e o feed de 10 itens, que ordenam estritamente por `reviewedAt desc`.

Não existe moderação, denúncia nem soft-delete em nenhum lugar de `src/` — o único remédio hoje é cirurgia no banco.

Mitigações já presentes: `/listas?ordem=curtidas` ranqueia por curtidas e continua limpo, e as resenhas exigem uma `Media` distinta por linha, porque `Entry` é único em `(userId, mediaId)`.

**Onde**

- `src/server/repositories/lista.repository.ts:114-119` — `list.findMany` sem `where`
- `src/server/repositories/atividade.repository.ts:69-72`
- `src/app/api/v1/listas/route.ts` — POST sem limitador

**Correção proposta**

`limitarLista` e `limitarAvaliacao` (achado 6), mais limite de autoria nos rankings públicos: em `listarListasPublicas` e `listarResenhasDaComunidade`, buscar a mais (`take: limite * 4`) e deduplicar para 1-2 linhas por `userId` no mapeamento antes de cortar em `limite`, para que nenhuma conta ocupe uma página inteira nem dentro da própria cota.

**Decisão em aberto:** 1 ou 2 por autor, e se a regra vale também para `?ordem=curtidas`.

---

### 15. ?q= repetido derruba /catalogo com 500

**Severidade:** baixa · **Issue:** #145

`/catalogo?q=um&q=dois`: o Next entrega `["um","dois"]`, `interpretarFiltros` faz `params.q?.trim()` — o optional chaining só protege contra null/undefined — e lança `TypeError: params.q.trim is not a function`.

Não existe `error.tsx` nem `global-error.tsx` em nenhum lugar sob `src/app`, então o render falha e o Next serve o 500 genérico.

Só a vítima que segue o link é afetada, e nada vaza; a falha acontece antes de qualquer I/O de banco ou AniList, então nem amplifica carga.

**Onde**

- `src/server/domain/catalogo-filtros.ts:53` — `termo: params.q?.trim() ?? "",` com o parâmetro tipado `q?: string`
- `src/app/(ui)/catalogo/page.tsx:35` — `interpretarFiltros(await searchParams)` sem sanear

**Correção proposta**

Em `interpretarFiltros`, parar de confiar nos tipos declarados: alargar o parâmetro para `Record<string, string | string[] | undefined>` e ler todo campo por um helper local — `function primeiro(valor: unknown): string | undefined` que devolve a string ou o primeiro elemento do array. É exatamente o que `interpretarOrdemDasListas` em `src/server/domain/lista-listagem.ts` já faz neste repositório.

Alargar `Props` em `catalogo/page.tsx` para `string | string[]`.

**TDD.** Caso `{ q: ["a","b"] }` em `tests/domain/catalogo-filtros.test.ts` antes da correção — é domínio puro, o teste é barato.

Vale abrir issue separada para `error.tsx`/`global-error.tsx`, que hoje não existem.

---

### 16. PUT /listas/:id/ordem vira até 502 statements numa transação

**Severidade:** baixa · **Issue:** #146

Lista com 500 itens — o teto do schema zod — e cada `PUT` com os mesmos ids embaralhados comita dois `findFirst` de posse mais 500 `updateMany` numa transação só, segurando lock nas 500 linhas `ListItem` durante todo o tempo.

Sem limitador na rota, o único freio é a latência do atacante. Alguns clientes em loop mantêm várias conexões Neon presas em transações longas de escrita, e num pool de free tier isso basta para consultas de usuários comuns enfileirarem atrás.

Pressão de lock e de conexão, não queda garantida.

**Onde**

- `src/server/repositories/lista.repository.ts:254-261` — `await prisma.$transaction(mediaIds.map(...updateMany...))`
- `src/app/api/v1/listas/[id]/ordem/route.ts:13` — `.max(500)`, e nenhum limitador no arquivo

**Correção proposta**

Colapsar em um statement dentro de `reordenarItens`:

```sql
UPDATE "ListItem" SET position = v.pos
FROM (VALUES ...) AS v(media_id, pos)
WHERE "listId" = $1 AND "mediaId" = v.media_id
```

via `$executeRaw` com parâmetros — nunca interpolação de string.

Alternativa sem SQL cru: `reordenarItensDoSistema` em `lista.service.ts` compara a ordem proposta com a atual e emite update só para o que mudou de posição. Reordenação real costuma mexer em poucas posições.

Nos dois casos, orçamento por usuário na rota via `verificarERegistrar`.

---

### 17. docker-compose publica o Postgres em 0.0.0.0:5432 com credenciais no repositório público

**Severidade:** baixa · **Issue:** #147

A forma curta `- "5432:5432"` sem endereço faz o Docker publicar em todas as interfaces. O repositório é público e traz usuário, senha e banco todos literalmente `mymangatracker`.

Quem estiver no mesmo segmento de rede que um desenvolvedor rodando `docker compose up -d` — laboratório da faculdade, coworking, wifi de café — varre a porta 5432 e conecta com `psql -h <ip> -U mymangatracker -d mymangatracker`. Lê e escreve tudo: `User` com e-mail e `passwordHash` para quebra offline, e as duas tabelas que o `CLAUDE.md` declara privadas do dono — `ReadingSource.urlTemplate` e `ReadingProgress.resolvedUrl`, que registram em que agregadores os desenvolvedores leem e exatamente que páginas abriram.

Vítima é a máquina do desenvolvedor. Nenhum dado de produção é alcançável por aí.

**Onde**

- `docker-compose.yml:6-7` — forma curta `- "5432:5432"`, sem endereço
- `docker-compose.yml:9-11` — usuário, senha e banco todos `mymangatracker`
- Mesmo par repetido em `.env.example` e `.github/workflows/ci.yml`; é o único compose do repositório, não há override que restaure loopback

**Correção proposta**

Uma linha: `docker-compose.yml:7` → `- "127.0.0.1:5432:5432"`.

Nada no projeto conecta de outro host: `.env.example`, `prisma migrate dev`, `prisma studio` e a suíte de banco usam `localhost`, e o CI usa service container próprio.

Senha forte via variável de ambiente é opcional — o bind é a mudança que fecha a exposição.

## Endurecimento

Sem caminho de ataque vivo hoje. Guarda-chuva: #148.

### 1. AuthAttempt cresce sem limite

`limparTentativas` (`auth-attempt.repository.ts:27-30`) é o único delete, e só é alcançado por `liberarLogin` — isto é, `scope='login'` com sucesso. Linhas de `cadastro` e `comentario` nunca são recolhidas, nem sob tráfego legítimo. Requisição bloqueada não grava (`limite.service.ts:63-66`), então não há ataque isolado.

**Correção:** Delete amostrado dentro de `registrarTentativa` para linhas mais velhas que a maior janela (60 min), ou um Vercel Cron; ou a tabela de contador por `(scope, key, bucket)`, que também resolve o achado 2.

---

### 2. Avatar: nenhum byte é inspecionado, e a resposta não tem nosniff

`validarAvatar` (`domain/avatar.ts:14`) compara só o MIME **declarado** pelo cliente (`perfil/avatar/route.ts:38`), e o GET devolve esse MIME literalmente com cache de um ano e sem `X-Content-Type-Options` (`usuarios/[username]/avatar/route.ts:37,40`). Não é explorável hoje: `image/svg+xml` e `text/html` não passam no allowlist exato, navegador não fareja HTML a partir de `image/*`, e o único `dangerouslySetInnerHTML` do app renderiza a constante estática `SCRIPT_TEMA` (`layout.tsx:87`). É um gadget que só paga se alguém introduzir injeção de markup ou uma CSP `script-src 'self'`.

**Correção:** `nosniff` — já vem no bloco `headers()` do achado 9 — e derivar o MIME dos magic bytes dentro de `validarAvatar`, função pura em `domain/`, testável primeiro.

---

### 3. A pré-checagem de Content-Length do avatar falha em aberto

`Number(request.headers.get("content-length") ?? 0)` (`perfil/avatar/route.ts:31`) vale 0 sem header e NaN com lixo; ambos passam o 413 e o corpo inteiro é bufferizado em `:42` antes de `validarAvatar` recusar corretamente. Na Vercel o teto de ~4,5 MB da plataforma limita o excesso a ~9x; num `next start` self-hosted não há teto. O controle real nunca é burlado: avatar grande ou de tipo errado jamais é gravado.

**Correção:** Tratar header ausente/NaN como desconhecido e ler `request.body.getReader()` acumulando `byteLength`, cancelando com 413 no primeiro chunk que passar do limite — aí o comentário da rota (linhas 4-5) passa a ser verdade.

---

### 4. ReviewLike e ListLike não têm guarda de auto-relação, Follow e ProfileLike têm

A autora curte a própria resenha e sobe no ranking por curtidas; a ação idêntica contra o próprio perfil é recusada com 422. Assimetria provável, não teórica: `migrations/20260903174027_follow_profile_like/migration.sql:46-47` traz os dois únicos CHECKs de auto-relação; `schema.prisma:156` e `:232` não têm nenhum.

**Correção:** Decidir e escrever. Se não é intencional, devolver o dono do objeto no lookup que o achado 8 já adiciona e recusar em `curtirReview`/`curtirLista` com `{ estado: "a_si_mesmo" }`, reusando `podeSeRelacionar` de `domain/social.ts`. Se é intencional, documentar no cabeçalho do repositório.

---

### 5. As chaves de AuthAttempt são SHA-256 sem sal de entradas de baixa entropia

`chaveDeTentativa` (`domain/limite-de-tentativas.ts:43-47`) hasheia `[ip, email]`, `[ip]` e `[userId]` sem sal, pepper ou stretching, enquanto o docblock afirma que a tabela não pode virar lista de e-mails e IPs em claro. Quem tiver um dump precomputa os 2^32 IPv4 e recupera exatamente isso. Sem caminho pela rede — só pós-vazamento.

**Correção:** `createHmac("sha256", pepper)`, com o pepper vindo por parâmetro (domínio não importa nada do projeto) de um `pepperDoLimite()` novo em `infra/config.ts`, na mesma forma de `segredoDaSessao()`.

---

### 6. Não existe caminho de exclusão para dado de leitura nem para a conta

Zero `delete` sobre `user`, `readingProgress`, `readingSource` e `shelfEntry` em todo `src/server/repositories/`; `estante/[id]/route.ts` só exporta PATCH; nenhuma das 23 rotas é um DELETE de perfil. Não é vulnerabilidade — o `userId` está em toda consulta — é lacuna de produto e de LGPD que o schema já antecipa, com Cascade em `User`.

**Correção:** `DELETE /api/v1/perfil` (`user.delete`) e deletes escopados por dono para uma linha de `ReadingProgress` e uma `ReadingSource`.

---

### 7. tests/repositories/setup.ts promove DATABASE_URL_TEST sem exigir sufixo _test

A guarda mora no script que **não** apaga nada (`scripts/migrate-test-db.mjs:23`), enquanto quem apaga é `tests/repositories/apoio.ts:5-23` — 13 `deleteMany()` sem filtro terminando em `user.deleteMany()`. `vitest.db.config.mts` é invocável direto (extensão do VS Code, `vitest run --config`), pulando a guarda, que só é encadeada por `package.json:12`.

**Correção:** Mover a checagem de sufixo para antes de `tests/repositories/setup.ts:15`, idealmente exportando `nomeDoBanco` mais a asserção de um módulo compartilhado que os dois importem, para as cópias não divergirem.

---

### 8. pnpm build roda prisma migrate deploy contra qualquer DATABASE_URL

`scripts/migrate-if-configured.mjs:19-23` tem uma única condição — presença da variável (`:8`) — sem `VERCEL_ENV`, sem checagem do banco alvo, e não há `vercel.json`. Um Preview cujo `DATABASE_URL` apontasse para produção aplicaria DDL não revisado antes de qualquer review. Dois fatos internos argumentam contra o pior caso: `README.md:144-145` afirma branch Neon por PR, e `tasks/todo.md` registra que não há banco de produção ainda. Nenhuma migration existente contém `DROP TABLE`/`DROP COLUMN`/`TRUNCATE`.

**Correção:** Segunda condição no mesmo script — rodar só quando `VERCEL_ENV` for `production` ou ausente; para `preview`, logar e `process.exit(0)` como a branch de URL ausente. Cruza com a decisão já registrada na #110.

---

### 9. A extensão embarca localhost:3000 no build distribuído, e tenta produção primeiro

`extension/comum.js:12` e `manifest.json:13-17`. Consequência de segurança exige código já rodando na máquina da vítima — para escutar na 3000 e plantar um cookie `kidoku_sessao` numa origem localhost — e é anulada se houver sessão de produção, porque `sessao()` devolve na primeira encontrada. Consequência prática, essa sim provável: um mantenedor logado nos dois testa localmente e grava `ReadingProgress` **em produção**, sem nada na tela distinguindo os ambientes (`popup.js:61-64` usa a base só em `href`s de texto fixo).

**Correção:** Separar ambiente do código distribuído — build de produção com `AMBIENTES` e `host_permissions` só da origem Vercel, localhost num overlay de dev. Enquanto o build for único, mostrar `new URL(base).host` como texto visível no header do popup. Entra junto das pendências da extensão (#91).

---

### 10. extension/README.md:34 descreve mal o que a permissão tabs concede

"Nenhuma permissão em sites de terceiros", enquanto o Chrome apresenta a permissão como "Ler seu histórico de navegação" — `background.js` de fato passa `aba.url` e `aba.title` de toda aba a cada navegação. A concessão **corresponde** ao recurso implementado (o badge precisa disso, e não existe forma mais estreita), então não há defeito de segurança: é consentimento desinformado sobre exatamente a classe de dado que o projeto trata como invariante.

**Correção:** Só documentação. Reescrever o item para dizer o que o Chrome vai exibir, mantendo a segunda cláusula, que é exata: "não injeta script nem lê DOM".

---

### 11. GET /api/v1/health é anônimo, sem cache e sem teto, e o memo do AniList não sobrevive a falha

Cada requisição é um `SELECT 1` garantido, e `lembrarPorTempo` vive em escopo de módulo e limpa `lembrada` no `catch` (`domain/memoria-curta.ts:30`) — durante uma indisponibilidade do AniList o memo fica desligado e cada `/health` vira um POST novo, mantendo a cota fixada em zero depois que o atacante do achado 4 parar.

**Correção:** Janela de falha separada e curta em `lembrarPorTempo` em vez de limpar; e tirar a sonda do AniList do corpo padrão de `/health`, expondo-a atrás de uma flag — sonda de liveness não precisa testar terceiro a cada poll.

---

### 12. GET /api/v1/health publica estado de configuração e latência

`session_secret: not_configured` anuncia janela em que nenhuma sessão pode ser emitida. Sem credencial, sem dado de usuário, sem caminho para nenhum dos dois — e a supressão de erro está certa e travada por teste: `health.service.ts` descarta o objeto de erro, e `tests/services/health.service.test.ts:126` afirma que string de conexão Neon não vaza no payload.

**Correção:** Opcional. Devolver só `status` e `checkedAt` a chamador anônimo e proteger `dependencies[]` atrás de `usuarioDaSessao()`.

---

### 13. POST /listas/:id/itens apaga o item que acabou de criar quando dois adds correm

Duplo clique em `adicionar-a-lista.tsx`, que não desabilita o botão em voo: a segunda requisição bate no unique, é lida como `jaExistia` e chama `removerItem`, apagando a linha da primeira. Escopo é a própria lista do dono — bug de correção e de UX, não de segurança.

**Correção:** A forma delete-primeiro/insert-se-zero que o próprio repositório já usa em `lista.repository.ts:290-305` e `review-social.repository.ts:173-197`, ou desabilitar o botão em voo como `acoes-sociais.tsx` faz.

---

### 14. alternarSeguir e alternarCurtidaDoPerfil mascaram qualquer falha como 404

`catch { return null; }` nu em `social.repository.ts:46` e `:79`: com o banco fora, todo follow responde 404 "usuário não encontrado" e nada é logado, porque o `console.error` da rota nunca dispara. Ninguém ganha acesso — é observabilidade.

**Correção:** Discriminar por código como `review-social.repository.ts:181-195` já faz no mesmo repositório: P2003 e o CHECK de auto-relação → null/404, P2002 → já ativo, P2025 → já inativo, resto relançado para virar 500 logado.

---

### 15. pnpm audit: 6 avisos (3 high, 3 moderate), todos na árvore do CLI do Prisma

Reexecutado na auditoria: `{"moderate":3,"high":3,"critical":0}` em 670 dependências, e todos os caminhos passam por `prisma@7.10.0` — lodash via `@prisma/studio-core`, `deepmerge-ts` via `@prisma/config`, `mysql2` direto. `prisma` é peer **opcional** de `@prisma/client` e devDependency (`package.json:32`), então o tracing do Next não o traz para o bundle da função. Nada sob `src/` importa nenhum dos três.

**Correção:** Nenhuma ação de runtime; se quiser CI verde, `pnpm.overrides`. À parte, por consistência: `@prisma/adapter-pg`, `@prisma/client`, `jose` e `zod` estão com caret enquanto `next`, `react`, `react-dom` e `prisma` estão pinados.

## O que foi varrido e está limpo

Dez lentes mais um passe crítico de completude.

### authn · sessão

JWT HS256 via `jose` com payload só de `sub` — sem e-mail, papel ou nome vazando para quem tem o cookie. `verificarSessao` fixa `algorithms: ["HS256"]`, fechando confusão de algoritmo e `alg: none`. Token inválido, expirado ou malformado é ausência de sessão, nunca erro. `segredoDaSessao()` recusa iniciar sem `SESSION_SECRET`, sem fallback para segredo padrão. O login não é oráculo de e-mail: `HASH_FANTASMA` faz o scrypt correr igual para conta inexistente — e o hash fantasma foi conferido, bem-formado para o caminho scrypt, então `verificarSenha` realmente deriva em vez de curto-circuitar no parse.

**Lacunas:** revogação (achado 7) e CSRF de login (achado 1).

### authz · IDOR

Não foi achada nenhuma rota que aceite um id de outro dono. Toda leitura e escrita de estante, progresso, fonte, avaliação e lista resolve o `userId` da sessão no controller e o carrega no `where` do repositório — `buscarEntradaDoUsuario` filtra `{ id: entradaId, userId }`, `adicionarItem`/`reordenarItens`/`removerItem` fazem `list.findFirst({ where: { id: listaId, userId } })` antes de escrever, e o perfil só monta a estante quando `souEu`.

**Lacunas:** único desvio é o achado 8, que é precondição de estado ausente, não posse.

### invariante de privacidade

O invariante do `CLAUDE.md` se sustenta no código: toda consulta de `ReadingSource` e `ReadingProgress` carrega `userId` — `listarAberturas`, `ultimaAbertura`, `maiorCapitulo`, `buscarFonteAtiva`, `listarFontesAtivas` — e nenhuma delas entra em contagem, ranking ou feed público. As respostas de API são DTOs do contrato, não entidades do Prisma. `perfil.service.ts` fecha a estante alheia com `souEu ? deps.listarEstante(...) : Promise.resolve(null)`.

**Lacunas:** a única forma de outro usuário ver esse dado é o achado 1, que não quebra nenhum `where` — sequestra a identidade antes da consulta.

### injection · SSRF

Nada de SQL cru com interpolação: o único `$queryRaw` é o `SELECT 1` literal do health. O AniList é chamado por GraphQL com variáveis parametrizadas contra endpoint fixo, com `AbortSignal.timeout`. `normalizarUrlVisitada` recusa esquema fora de http/https, host vazio e userinfo, com teto de 2048 — e nenhuma URL controlada pelo usuário é buscada pelo servidor, então não há SSRF.

### XSS · CSRF · headers

Um único `dangerouslySetInnerHTML` em todo o app (`layout.tsx:87`), alimentado por constante de módulo sem interpolação; nenhum `innerHTML`, `srcDoc`, `eval` ou `new Function` em `src/app`, `src/server` ou `extension/`. O escape padrão do React cobre todo texto de usuário.

**Lacunas:** CSRF (achado 1) e ausência total de headers de segurança (achado 9).

### upload · avatar

Injeção de header em `Content-Type` é impossível — o valor guardado é sempre um de três literais exatos. `image/svg+xml` está corretamente fora do allowlist, fechando XSS armazenado pelo tipo declarado; a resposta usa ETag/304.

**Lacunas:** sem magic bytes, sem `nosniff`, pré-checagem de tamanho falhando em aberto e sem teto de escrita — endurecimento e achado 6.

### rate-limit · DoS

É a área mais fraca do sistema e rendeu os achados 2, 3, 4, 5, 6, 11, 14 e 16. O que está certo: o limite roda **antes** do scrypt, requisição bloqueada não grava linha — então não realimenta o próprio bloqueio — e o projeto já tem tanto o mecanismo (`verificarERegistrar`) quanto o memo (`lembrarPorTempo`). Só não os aplicou onde precisa.

### segredos · config · deploy

Nenhuma credencial real commitada, worktree ou histórico: `.gitignore` exclui `.env*` menos `.env.example`, e as únicas credenciais no repositório são as fixtures do Postgres local. `health.service.ts` descarta deliberadamente o objeto de erro para que mensagem de driver Postgres — host, usuário, às vezes senha — não chegue ao corpo público, travado por teste. `sessionSecret` é reportado como booleano, nunca como valor. `next build` não depende de banco.

**Lacunas:** bind do docker-compose (achado 17) e ausência de guarda de ambiente na migration (endurecimento).

### extensão MV3

O token nunca é persistido — `chrome.storage.local` guarda só `pares` — e nunca sai das duas origens de `AMBIENTES`; `background.js` nunca chama `sessao()`; as duas únicas chamadas `fetch` do código apontam para origens fixas. Não injeta script nem lê DOM.

**Lacunas:** URL crua da aba (achado 12), localhost embarcado e README impreciso (endurecimento).

### deps · validação

Todo controller valida corpo com zod antes de delegar, com tetos explícitos: `review` 20000, `anilistIds` 500, `senha` 72, `email` 254. Auditoria de dependências reexecutada: 6 avisos, nenhum alcançável do runtime da aplicação.

### passe crítico de completude

Confirmado que não existem `middleware.ts`, `vercel.json`, `Dockerfile` nem arquivos `"use server"`, e que `next.config.ts` está vazio — ou seja, **cada rota e cada página aplica a própria autorização**, e não há camada anterior que pudesse silenciosamente estar segurando alguma dessas lacunas. Também confirmado que `src/generated/prisma/**` foi tratado como código de fornecedor e não auditado.

## Método

Dois agentes de reconhecimento montaram o inventário de rotas e autorização e o mapa de modelo
de dados e privacidade. Dez lentes independentes varreram em paralelo, cada uma cega para o que
as outras achavam. Cada dimensão passou por um revisor adversarial instruído a **refutar** —
abrindo os arquivos citados, conferindo se a evidência existia e procurando a guarda que
anulasse o ataque, com REFUTADO como default sob incerteza. Um crítico de completude então caçou
o que a varredura tinha deixado passar (cache do App Router em página autenticada, TOCTOU, abuso
de lógica de negócio, encadeamento de achados), e os candidatos novos passaram pela mesma
refutação.

Dos 93 candidatos, 44 sobreviveram à refutação por dimensão e 5 vieram do crítico. A síntese
deduplicou para 17 achados com caminho de ataque vivo mais 15 itens de endurecimento. Nenhum
achado foi classificado como crítico ou alto, então a etapa de verificação profunda em duas
lentes não teve entrada.

Os três achados do topo foram reconferidos à mão contra `sessao/route.ts` e `limite.service.ts`
antes de virar issue.

### Ressalva de escopo

O achado 11 (`ipDoPedido` confia no primeiro `x-forwarded-for`) **não é explorável no deploy
Vercel atual** se a borda substituir o header em vez de anexar. Isso não é verificável pelo
repositório — a issue #141 começa pedindo essa confirmação contra o deploy.
