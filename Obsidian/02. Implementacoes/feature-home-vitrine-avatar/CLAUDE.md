# feature/home-vitrine-avatar — foto de perfil e vitrine da home (#76)

## Objetivo

Duas coisas pedidas juntas em 03/09: o leitor sobe a própria foto de perfil, e
a home ganha uma vitrine de resenhas e listas em carrossel, com o catálogo e a
atividade recente reorganizados em duas colunas.

## Escopo

### Foto de perfil

1. `User.avatar Bytes?`, `avatarMime String?`, `avatarUpdatedAt DateTime?`
   (migration aditiva).
2. Domínio `avatar.ts` (TDD): mime em jpeg/png/webp, tamanho até 512 KB.
3. Repositório: salvar, apagar, buscar por username. Os bytes NUNCA entram no
   select público — o teste de privacidade do usuário trava isso.
4. Serviço `avatar.service.ts` (TDD): definir, remover, servir.
5. Rotas: `PUT`/`DELETE /api/v1/perfil/avatar` (corpo binário, dono da
   sessão) e `GET /api/v1/usuarios/:username/avatar` (público, cache por
   `avatarUpdatedAt`, 404 sem foto).
6. Tela: o círculo do header do perfil vira a foto; o dono tem "Trocar foto"
   e "Remover". O navegador recorta e reduz para 256×256 JPEG antes de enviar.

### Vitrine da home

1. Repositórios: resenhas e listas **recentes** (já existem) e **mais
   curtidas na janela** (curtidas dadas nos últimos 7 dias, agrupadas).
2. Serviço `vitrine.service.ts` (TDD): as quatro listas de uma vez; fonte
   que falha vira lista vazia, como o feed.
3. Componente `Carrossel` (client): rolagem contínua, pausa no hover e no
   foco, setas, `prefers-reduced-motion` desliga o movimento.
4. Home, nova ordem: Continuar lendo → carrossel de Resenhas → carrossel de
   Listas → grade `2/3 + 1/3`: catálogo popular com "ver mais →" no fim,
   atividade recente (feed #50) na coluna estreita.

## Decisões tomadas (03/09)

| Decisão | Valor | Motivo |
|---|---|---|
| Onde a foto vive | Postgres, `bytea` | escolha do usuário; Vercel sem disco, zero credencial nova |
| Tamanho | 256×256 JPEG recortado no navegador, limite 512 KB no servidor | ~30 KB por foto; o servidor não processa imagem |
| Servir | rota própria com `Cache-Control` e `ETag` = `avatarUpdatedAt` | troca de foto invalida o cache pela versão na URL |
| Recorte público | `temAvatar` + `avatarVersao` no DTO; bytes só na rota de imagem | e-mail e id continuam fora; bytes não vazam em lista nenhuma |
| Carrossel (v3, 03/09) | "palco": 5 cards, centro em destaque, 2 de cada lado esmaecidos, setas nas bordas, avanço a cada 4 s | pedido do usuário; scrollLeft por frame pesava e fazia a página rolar na horizontal |
| Seletor do carrossel | **removido** (03/09): só recentes, sem "ver listas" | usuário simplificou; "mais curtidas" foi para `/listas` (#80) |
| `/listas` (#80) | grade de cards (o `CardLista` da vitrine, fluido) com `?ordem=recentes\|curtidas`, whitelist no domínio | ordena por curtidas acumuladas, empate pela criação |

## Pendências

- Avatar nos cards do feed e nas resenhas (hoje só no perfil).
- Ajustar a janela (7 dias) quando a comunidade crescer.

## Referências

- Issue #76. Feed: feature-reviews-sociais e #50. Perfil: feature-perfil-usuario.
