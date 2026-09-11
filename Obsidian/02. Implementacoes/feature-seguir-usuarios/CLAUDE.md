# feature/seguir-usuarios — seguir usuários e curtir perfis (#74)

## Objetivo

Fase social do perfil: no header de `/u/:username`, seguir o leitor e curtir o
perfil, com os números visíveis a todos. Abre caminho para o feed de quem sigo.

## Escopo (rodada de 03/09)

1. Tabelas `Follow` e `ProfileLike` (migration aditiva, `CHECK` à mão).
2. Domínio `social.ts` (TDD): não seguir nem curtir a si mesmo.
3. Repositório `social.repository.ts`: toggle de seguir e de curtir, contagens,
   estado para quem olha.
4. Serviço `social.service.ts` (TDD): seguir/curtir por username; perfil ganha
   o bloco `social` (seguidores, seguindo, curtidas, `sigo`, `curti`).
5. Rotas `POST /api/v1/usuarios/:username/seguir` e `.../curtida`, contrato
   `{ ativo, total }` como o like de lista.
6. Tela: botões Seguir/Seguindo e Curtir no header do perfil, otimistas;
   anônimo vai para `/entrar`; o dono não vê os botões.
7. Teste de banco: unicidade por par, Cascade dos dois lados, `CHECK` de
   auto-relação, recorte sem e-mail nem id.

Fora desta rodada: lista de seguidores/seguindo, feed de quem sigo,
notificações.

## Decisões tomadas (03/09)

| Decisão | Valor | Motivo |
|---|---|---|
| Seguir | `Follow(followerId, followingId)`, único por par, Cascade dos dois lados | mesmo desenho do `ListLike`; usuário apagado leva os vínculos junto |
| Curtir perfil | `ProfileLike(userId, profileUserId)`, único, Cascade | pedido do usuário; igual à curtida de lista, só número |
| Auto-relação | `CHECK (followerId <> followingId)` e `CHECK (userId <> profileUserId)` na migration + regra no domínio | banco trava, domínio explica |
| Alvo da rota | username, não id | id de usuário nunca sai no recorte público (#49) |
| Contagens | no header, junto dos números atuais | sem tela nova |
| Feed | intacto | escopo fechado com o usuário |

## Pendências

- Páginas `/u/:username/seguidores` e `/seguindo`.
- Aba "Seguindo" no feed da home (#50).

## Referências

- Issue #74. Perfil: feature-perfil-usuario/CLAUDE.md. Curtida de lista:
  feature-lists/CLAUDE.md.
