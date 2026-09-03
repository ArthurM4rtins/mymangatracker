# feature-auth — cadastro, login e logout

Cobre as issues **#7** (cadastro), **#8** (login) e **#9** (logout). As regras detalhadas estão
nos corpos das issues — este doc só fixa as decisões de arquitetura que as issues deixam em aberto.

## Objetivo

Ciclo completo de conta: criar conta, entrar, sair. Sessão em cookie httpOnly com JWT (`jose`),
senha com `scrypt` do `node:crypto`.

## Decisões tomadas

- **Formato do hash de senha:** `scrypt$N$r$p$<salt-base64url>$<hash-base64url>`, parâmetros
  gravados junto (N=16384, r=8, p=1, keylen=64). Permite endurecer parâmetros no futuro sem
  invalidar hashes antigos — a verificação lê os parâmetros do próprio hash.
- **Unicidade username/email:** o repositório traduz o P2002 do Prisma para
  `ErroCampoDuplicado(campo)` (domínio). Serviço deixa passar; controller vira resposta 409 com
  o campo, e a tela mostra no formulário. O código de erro do Prisma não vaza da camada de repositório.
- **Leitura nunca devolve `passwordHash`:** o repositório tem dois caminhos —
  `buscarPorId`/DTOs de leitura (sem hash, via `select` explícito) e
  `buscarCredenciaisPorEmail` (com hash, usado só pelo serviço de sessão). Teste de privacidade
  cobre o caminho de leitura.
- **Tela conversa com a API**, não com server action: formulário client-side faz `fetch` no
  `POST /api/v1/usuarios` / `POST /api/v1/sessao`. Mantém o contrato REST versionado como única
  porta de escrita (requisito da arquitetura avaliada).
- **JWT:** HS256 com `SESSION_SECRET`, claim só `sub` (userId), expiração 7 dias. Sem a variável
  o serviço de sessão recusa iniciar (erro claro), nunca cai em segredo padrão.
- **Cookie:** `kidoku_sessao`, httpOnly, `sameSite: lax`, `secure` fora de dev, `path=/`,
  maxAge = expiração do JWT. Escrito e apagado só no controller.
- **Utilitário de sessão do controller (#9):** `src/app/api/v1/_shared/sessao.ts` — lê o cookie,
  verifica via `infra/sessao`, devolve `userId | null`. Fica na camada de controller (é quem pode
  tocar `cookies()`); páginas privadas resolvem sessão por ele via server component depois
  (decisão fina fica para a issue #11, quando a primeira tela privada existir).

## Escopo

- `POST /api/v1/usuarios` + `/cadastrar` (#7)
- `POST /api/v1/sessao` + `/entrar` (#8)
- `DELETE /api/v1/sessao` + botão sair + utilitário de sessão (#9)

## Pendências

- [x] #7 implementado e provado (teste visto vermelho antes; sonda de salt fixo vista falhando)
- [x] #8 implementado e provado (69 testes unitários verdes; token só com sub/iat/exp travado por teste)
- [x] #9 implementado (DELETE /api/v1/sessao, BotaoSair no header, `usuarioDaSessao()` em
  `src/app/api/v1/_shared/sessao.ts`; redirect de rota privada fica para a #11, quando a
  primeira rota privada existir)
- [ ] **`pnpm test:db` pendente nesta máquina** — sem Docker e sem `.env`. O teste
  `usuario.privacy.test.ts` está escrito; rodar quando houver Postgres local.
- [ ] Teste E2E manual do fluxo cadastro→login→sair — precisa de banco + `SESSION_SECRET` no `.env`.
- [ ] Commits por fatia quando o usuário liberar o git (por ora nada é commitado)

## Notas de implementação (31/08)

- Boundaries ganhou duas mudanças, ambas provadas quebrando depois (probe com imports
  proibidos → 3 erros → removido):
  1. liberação de builtin do Node (`node:*`) — o `domain/senha.ts` usa `node:crypto`;
  2. tipo de elemento `sessao` (`src/app/api/v1/_shared/**`), importável por `ui` e
     `controller` — é como o layout mostra Entrar/Sair sem furar as outras regras.
- Layout resolve sessão → todas as rotas viraram dinâmicas. Aceito e comentado no código.
- Hash: `scrypt$N$r$p$salt$derivada` (base64url); verificação lê parâmetros do próprio hash.

## Referências

- Issues: https://github.com/ArthurM4rtins/mymangatracker/issues/7 · /8 · /9
- Regras absolutas e pipeline TDD: `CLAUDE.md` da raiz
