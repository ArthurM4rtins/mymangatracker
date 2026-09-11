# Obra deixa de depender do AniList — feature/obra-sem-anilist

## Objetivo

Aceitar obra que o AniList não conhece. Hoje toda obra é identificada por
`anilistId`, e o que não tem mapeamento é descartado em silêncio — some do
catálogo inteiro.

## O que motivou

Buscando "The Beginning After The End" (10/09/2026), o Kitsu devolve três
registros: o manhwa de 2018 (`oel`), a novel de 2017 (`novel`) e uma side story
de 2023 (`oel`). **Nenhum tem mapeamento para o AniList**, e os três são
descartados por nós. A obra não existe no Kidoku.

Não é caso isolado. Medido na API do Kitsu, linhas descartadas só por falta de
mapeamento:

| busca | linhas | descartadas |
|---|---|---|
| omniscient reader | 4 | 75% |
| solo leveling | 8 | 50% |
| tower of god | 20 | 40% |
| berserk | 20 | 25% |
| one piece | 20 | 5% |

O padrão dói justamente onde o Kidoku vive: manhwa coreano some, mangá japonês
quase não. Some ainda `oel`, `oneshot` e `doujin`, que o domínio descarta de
propósito — cerca de 15% das linhas em buscas japonesas.

## Decisões tomadas

1. **Identidade vira o par (fonte, id externo).** Quem tem AniList continua
   identificada por ele, e o Kitsu vira o segundo nome da MESMA linha. Quem só
   existe no Kitsu é identificada por ele. Preserva a busca sob demanda pelo id
   externo, que é como as telas funcionam hoje.
   - Descartado: id interno nas rotas. Obrigaria a gravar a obra antes de poder
     linkar para ela, o que vai contra o "não espelhar catálogo" combinado com o
     uso justo do Kitsu, e quebraria links e favoritos existentes.
2. **Os três subtipos entram**: `oneshot` e `doujin` viram mangá japonês; `oel`
   vira obra sem país definido, que é honesto — é quadrinho de fora do Japão,
   Coreia e China.
3. **O AniList segue primário no código.** Como está fora (#215), o Kitsu já
   responde tudo na prática. Não aumenta a carga sobre eles justo antes de
   pedirmos uso correto da API, e se o AniList voltar nada precisa ser desfeito.

## Escopo

```
Media: anilistId Int? @unique   (era Int @unique, obrigatório)
       kitsuId   Int? @unique   (novo)
       CHECK: pelo menos um dos dois preenchido
```

Rotas passam a `/obra/<fonte>/<id>`, com redirect de `/obra/<id>` para
`/obra/anilist/<id>` — links e favoritos antigos continuam valendo.

## Regras específicas

- **Uma obra, uma linha.** Vinda do Kitsu COM mapeamento, grava nos dois campos
  e casa com a linha do AniList se já existir. Sem mapeamento, só `kitsuId`.
- Nenhuma tabela dependente muda: lista, estante, avaliação, fonte de leitura e
  progresso já apontam para `Media.id` interno. Isso é o que torna a mudança
  viável.
- A extensão não usa `anilistId` — trabalha com `entradaId` e URL. Fica intacta.
- `CHECK` não sai do schema do Prisma: escrever à mão na migration.
- Migration não pode quebrar linha existente: toda linha atual tem `anilistId`,
  então `Int?` é seguro e `kitsuId` nasce nulo.

## Fases

**Fase 1 (feita).** Migration com o `CHECK`, o domínio da referência e os três
subtipos aceitos. Os repositórios passam a excluir obra sem AniList de forma
EXPLÍCITA, marcada com `SEM_ANILIST` — o comportamento é idêntico ao de hoje,
mas fica à vista em vez de escondido num tipo que mentia.

**Fase 2 (feita).** A referência (fonte, id) atravessa as seis camadas. A obra
passa a ser dita por chave textual (`anilist:30002`, `kitsu:54598`) na API e nas
telas, a rota virou `/obra/<fonte>/<id>` com a antiga `/obra/<id>` valendo como
AniList, e todo `SEM_ANILIST` saiu. A escada de fontes, que estava escrita três
vezes, virou `obra-externa.service` e passou a dizer QUEM respondeu — sem isso a
página trocava cache velho por 404 sempre que o AniList caísse.

Provado no navegador em 10/09/2026: `/obra/kitsu/54598` abre "The Beginning
After the End" inteira, e a busca no catálogo devolve a obra.

## Pendências

- Gênero e autoria do Kitsu vêm por `include` separado (`categories`, `staff`);
  hoje não são pedidos. Decidir se entram nesta tarefa ou em outra.
- O cache local (terceiro degrau) continua filtrando só por título.
- Similares só existem no AniList: obra nascida no Kitsu não mostra a fileira.
- Obra do Kitsu não traz gênero nem autoria, então a página abre sem os dois.
- Falar com o Kitsu sobre uso correto da API, em paralelo (#238).

## Referências

- Issue: #254
- #238 — acervo próprio, a mesma raiz
- #215 — AniList devolvendo 403
- #252 — filtros do catálogo valendo também no Kitsu
