# Acervo próprio — o catálogo deixa de morrer quando o fornecedor morre

Desenho aberto em 09/09/2026, a partir da #215. **Aguardando aprovação.**

## O problema

O AniList desligou a API em 06/09 e continua fora três dias depois. A resposta é
deliberada, não bloqueio de bot:

```
POST https://graphql.anilist.co → 403
"The AniList API has been temporarily disabled due to severe stability issues."
```

Enquanto isso, `/catalogo`, "Populares agora" e toda obra fora do cache pararam.
Estante, listas, resenhas e progresso seguiram normais — dependem só do banco.

A diferença entre o que caiu e o que ficou de pé é a mesma: **quem lê do nosso
banco sobreviveu, quem lê do terceiro ao vivo não.**

## Objetivo

Ter **catálogo próprio no banco**. O terceiro vira fonte de atualização, não
dependência de tempo de execução. Queda do fornecedor deixa de ser queda do
produto e vira dado um pouco mais velho.

## A descoberta que torna isso barato

**O Kitsu entrega o `anilistId` de cada obra**, no mesmo pedido, via
`include=mappings`:

```
GET /api/edge/manga?page[limit]=20&include=mappings&sort=-userCount
→ mappings: anilist/manga = 30656   (Vagabond, o mesmo id que já está no nosso banco)
```

Medido em 09/09/2026, em quatro faixas do acervo: **79 de 80** obras vieram com
`anilistId`, inclusive em `offset=30000`, que é obra obscura.

Isso muda tudo, porque a identidade não precisa mudar:

| o que eu temia | o que de fato acontece |
|---|---|
| `Media.anilistId` teria que virar nulável | continua obrigatório |
| URLs `/obra/[anilistId]` mudariam | continuam iguais |
| Precisaria de coluna de fonte + id externo | não precisa |
| Obra do Kitsu seria "outra obra" | é a MESMA linha, mesma chave |

Quando o AniList voltar, ele atualiza exatamente as mesmas linhas.

## Escopo

### 1. Importador (script versionado, roda à mão)

Percorre o Kitsu por `sort=-userCount` (as mais lidas primeiro) e faz upsert em
`Media` por `anilistId`. Reusa `salvarMediaDoAniList`, que já é upsert por essa
chave — o formato de entrada é o mesmo `MediaDoAniList` do domínio.

- Vinte obras por pedido (o teto do Kitsu; 40 responde 400).
- Pausa entre pedidos. A documentação deles pede uso justo e recomenda guardar o
  que se exibe em vez de rebuscar.
- **Idempotente**: rodar duas vezes não duplica nem estraga.
- **Retomável**: guarda o offset alcançado, porque o processo é longo.

### 2. Catálogo passa a ler o banco

Hoje: AniList primeiro, banco no fallback (#165, feito em 09/09).
Depois: **banco primeiro**, sempre. É a inversão que dá o ganho — com acervo de
verdade, a busca local é rápida, funciona offline do terceiro e não gasta cota.

A página da obra continua indo ao AniList para o detalhe fresco, com o cache
respondendo quando ele falha, como já é hoje.

### 3. Atualização periódica

Um lote pequeno por vez, preferindo o mais velho (`syncedAt` mais antigo). Vale
para as duas fontes: com o AniList de pé ele é a fonte; fora dele, o Kitsu segura.

## Regras específicas

- **Obra sem `anilistId` no Kitsu não entra.** Sem identidade compartilhada, ela
  seria uma linha órfã que o AniList nunca vai reconhecer. Uma em oitenta, na
  amostra — o custo de ignorar é irrelevante.
- **Identificar o cliente**: `User-Agent: Kidoku/1.0 (+url)`. Descoberto na
  marra — a primeira bateria de testes levou **403 em tudo** por causa do agente
  padrão do cliente HTTP. Identificar de verdade, nunca fingir ser navegador.
- **Não inventar dado.** Campo ausente no Kitsu fica nulo. O Kitsu não traz país
  de origem; ele traz `subtype`, e `manhwa`/`manhua` mapeiam para Coreia/China.
  `manga` **não** implica Japão — fica nulo, e o AniList preenche depois.
- **Nome do Kitsu é pior**: `canonicalTitle` costuma ser o romanizado ("Boku no
  Hero Academia", "Oyasumi Punpun"). Aceitável como ponte; corrige sozinho quando
  o AniList atualizar a linha.
- **Teto no primeiro carregamento** — ver Pendências.
- Toda tela ou texto novo nasce nos cinco idiomas.
- TDD para domínio e serviço: a tradução do formato do Kitsu é domínio puro e o
  teste vem antes.

## Decisões tomadas

**Kitsu é ponte, AniList é destino** (decisão do usuário, 09/09/2026). O primeiro
carregamento sai do Kitsu porque o AniList está fora; quando ele voltar, é dele
que vem a atualização, e as mesmas linhas melhoram sozinhas.

**Acervo próprio, não segunda fonte ao vivo.** Descartado ligar o Kitsu como
fornecedor alternativo em tempo de execução: duas fontes ao vivo significam duas
formas de falhar e duas modelagens para conciliar a cada requisição.

## Pendências

1. **Ler os termos de uso do Kitsu sobre espelhar o acervo.** A documentação fala
   em uso justo e recomenda cachear o que se exibe, o que é favorável, mas não é
   autorização explícita para cópia integral. **Recomendação:** começar por um
   recorte das mais lidas — alguns milhares — que resolve o uso real e é
   claramente uso justo.
2. **Quantas obras no primeiro carregamento.** 63.065 é o acervo inteiro do Kitsu;
   varrer tudo dá ~3.150 pedidos, algo como vinte minutos. Com sinopse, a estimativa
   é de dezenas de megabytes — cabe no Neon, mas confirmar o limite do plano antes.
3. **Onde a atualização roda.** Cron da Vercel (o plano Hobby permite pouca
   frequência) ou script à mão. Cron pede rota protegida por segredo.
4. **Confirmar a inversão do catálogo para banco-primeiro.** É mudança de
   comportamento visível: a busca passa a mostrar o nosso acervo, não o do AniList.

## Referências

- #215 (AniList fora), #165 (o fallback de cache, já feito)
- `src/server/infra/anilist.ts`, `src/server/repositories/media.repository.ts`
  (`salvarMediaDoAniList`, `buscarMediasEmCache`)
- `prisma/schema.prisma`, modelo `Media` — `anilistId` é a chave que os dois
  fornecedores compartilham
- Kitsu: `https://kitsu.io/api/edge/manga`, docs em
  `https://hummingbird-me.github.io/api-docs/`
