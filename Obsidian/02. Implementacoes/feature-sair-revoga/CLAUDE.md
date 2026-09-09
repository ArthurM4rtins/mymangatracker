# Sair revoga a sessão — o JWT ganha algo revogável para apontar

Issue #137 (achado 7 da auditoria de 06/09). Desenho aberto em 08/09/2026. Aguardando aprovação.

## Objetivo

Hoje "Sair" só apaga o cookie (`sessao/route.ts`, `DELETE`). O JWT continua válido pelos 7 dias inteiros: quem copiou o valor de `kidoku_sessao` uma vez — notebook emprestado, segunda extensão com permissão `cookies` — segue lendo a estante privada e escrevendo histórico via `Authorization: Bearer`, de qualquer lugar, sem navegador. E o Bearer vale em **todas** as 27 entradas autenticadas (18 rotas, 9 páginas), não só nas duas que a extensão usa.

Objetivo: sair invalida o token de verdade, e o Bearer só entra onde a extensão precisa.

## Por que o token não é revogável hoje

`infra/sessao.ts`: payload só com `sub`, `iat`, `exp`. `verificarSessao` é `jwtVerify` puro — não consulta nada. Não há `jti`, versão nem tabela de sessão. Certo para o que era (#8: nada no payload que vaze), insuficiente para revogar.

## Decisões propostas

### 1. `tokenVersion` no `User`, não tabela de sessão

`tokenVersion Int @default(0)` em `model User`. Migration aditiva, sem backfill além do default. O payload ganha `ver`; a verificação compara `ver` do token com o do banco; `DELETE /sessao` incrementa.

Tabela de sessão daria revogação por aparelho ("sair de todos" vs "sair daqui"), mas custa entidade nova, índice, limpeza de expirados e uma tela para listar sessões. `tokenVersion` revoga **tudo de uma vez** — que é exatamente o que "sair" precisa fazer quando o motivo é token roubado, e é o que a troca de senha (#176) vai precisar. Se um dia quiser "sair só daqui", é evolução, não retrabalho.

### 2. A comparação mora no serviço, com repositório — nunca em `infra/`

Regra de camada: `infra/` não importa repositório. Então:

- `infra/sessao.ts`: `assinarSessao(userId, { versao })` põe `ver`; `verificarSessao` devolve `{ userId, versao }` (token antigo sem `ver` conta como `0`, para não derrubar quem já está logado no deploy).
- `services/sessao.service.ts`: `resolverSessao(token, deps)` = verificar (infra) → `deps.buscarVersao(userId)` (repositório) → igual devolve o `userId`, diferente devolve `null`. E `sair(userId, deps)` incrementa.
- `_shared/sessao.ts` (controller): `usuarioDaSessao` passa a chamar o serviço em vez da infra direto.

Custo: **uma leitura no banco por pedido autenticado** — `SELECT tokenVersion FROM User WHERE id = ?` por chave primária. Hoje é zero. Para este projeto é aceitável; se pesar, cache curto no serviço é o próximo passo, não agora.

### 3. `DELETE /sessao` incrementa ANTES de apagar o cookie

Lê o `userId` do token que está saindo, incrementa a versão, então limpa o cookie. Sem token válido (já expirado, ou cookie de outro deploy), só limpa — não há o que revogar. Cookie roubado que tenta sair de novo depois também não faz mal: incrementar duas vezes é revogar duas vezes.

### 4. Bearer só onde a extensão chama

`usuarioDaSessao({ aceitarBearer: true })` com default `false`. `true` só em `GET /api/v1/estante` e `POST /api/v1/leitura` — as duas rotas de `extension/popup.js` e `background.js`. As outras 16 rotas e as 9 páginas voltam a aceitar só cookie. Token vazado deixa de servir para apagar lista, seguir, comentar ou trocar avatar sem navegador.

### 5. `sameSite: "lax"` fica

`strict` derrubaria a sessão em todo link externo para o site. A #131 já fechou o CSRF no login por outro caminho.

## Semântica fina

- Token com `ver` menor que o banco → `null`, igual a expirado: sem sessão, sem 500, sem mensagem diferente.
- Token **sem** `ver` (assinado antes deste deploy) → tratado como `0`. Enquanto o usuário não sair, continua valendo; ao sair, a versão vira 1 e o token antigo morre. Ninguém é derrubado pelo deploy.
- Entrar de novo assina com a versão **atual** — o token novo já nasce válido.
- `tokenVersion` nunca sai em DTO nenhum: é interno, e só existe para comparar.

## Pendências

### 1. Duração da sessão (a decisão em aberto na issue)

Hoje 7 dias, sem renovação: cortar significa logar de novo com mais frequência, porque não existe "sliding session". O que muda o jogo neste achado é a **revogação**, não a duração — com ela, o token roubado morre no próximo "Sair" ou troca de senha.

Opções: **(a)** manter 7 dias; **(b)** cortar para 24 h; **(c)** 7 dias com renovação silenciosa a cada pedido (token novo no cookie quando passou de metade da vida) — custa mais código e um `Set-Cookie` em resposta de página.

**Recomendação: (a)** agora, e abrir issue para (c) se a duração incomodar. Cortar sem renovar só troca segurança marginal por logins semanais.

### 2. Uma leitura no banco por pedido autenticado

Aceitável? É o preço de revogar sem tabela de sessão. Recomendação: sim, medir depois.

### 3. Trocar de senha (#176) reusa o incremento

Anotar na #176 que `sair(userId)` é o que ela chama ao redefinir. Não entra aqui.

## Pipeline

teste da infra (payload com `ver`, verificação devolve versão, ausência vira 0) → infra → migration (`tokenVersion`, validar no dev antes de aplicar) → repositório (`buscarVersaoDoToken`, `incrementarVersaoDoToken`) + teste de banco → teste do serviço (`resolverSessao`: igual passa, diferente null, sem `ver` é 0; `sair` incrementa) → serviço → controller (`usuarioDaSessao` pelo serviço; `aceitarBearer`; `DELETE` incrementa) → provas com `curl`: sair e reusar o token → 401; Bearer em rota que não é da extensão → 401; extensão continua nas duas dela.

## Referências

- #137 (esta), #131 (CSRF, fechada), #176 (troca de senha, reusa o incremento), #8 (payload mínimo)
- `src/server/infra/sessao.ts` — assina e verifica
- `src/app/api/v1/_shared/sessao.ts:60-100` — `tokenDoHeader`, `usuarioDaSessao`
- `src/app/api/v1/sessao/route.ts` — `DELETE` que só apaga o cookie
- `extension/comum.js` `sessao()` — a origem do Bearer
