# Acervo próprio — espelhar o AniList, com o Kitsu tapando o buraco

Desenho aberto em 09/09/2026, a partir da #215. **Aguardando aprovação.**

> Correção de rumo: a primeira versão deste desenho propunha **importar o acervo
> do Kitsu em massa**. Não é isso. O acervo a ser espelhado é o do **AniList**.
> O Kitsu entra só enquanto o AniList estiver fora, e **sob demanda**.

## O problema

O AniList desligou a API em 06/09 e continua fora três dias depois. A resposta é
deliberada, não bloqueio de bot:

```
POST https://graphql.anilist.co → 403
"The AniList API has been temporarily disabled due to severe stability issues."
```

`/catalogo`, "Populares agora" e toda obra fora do cache pararam. Estante, listas,
resenhas e progresso seguiram normais.

A diferença é sempre a mesma: **quem lê do nosso banco sobreviveu, quem lê do
terceiro ao vivo não.**

## Objetivo

**Espelhar o catálogo do AniList no nosso banco**, e manter o espelho atualizado.
O AniList vira fonte de sincronização, não dependência de tempo de execução —
queda dele passa a significar dado um pouco mais velho, nunca produto quebrado.

## As duas fases, e por que nesta ordem

### Fase 1 — agora, com o AniList fora: Kitsu **sob demanda**

Enquanto não dá para espelhar, o produto precisa funcionar. Quando alguém busca
ou adiciona uma obra e o AniList falha, o Kitsu responde **àquela busca**, e só a
obra escolhida é gravada.

Nada de varredura em massa do Kitsu. Três motivos:

1. **Não é o acervo que queremos.** O espelho é do AniList; copiar o do Kitsu
   traria dado que depois seria sobrescrito de qualquer forma.
2. **Os termos.** A documentação do Kitsu fala em uso justo e recomenda cachear o
   que se exibe. Guardar o que a pessoa pediu é exatamente isso; espelhar 63 mil
   obras não é.
3. **Qualidade pior.** `canonicalTitle` costuma vir romanizado ("Boku no Hero
   Academia", "Oyasumi Punpun"), e a contagem de capítulos falta em obra em
   publicação.

O que entra pelo Kitsu é **provisório por natureza** e melhora sozinho na Fase 2.

### Fase 2 — quando o AniList voltar: espelhar de verdade

Varredura completa por `Page(perPage: 50)`, upsert por `anilistId`, e depois
sincronização periódica em lotes, preferindo o registro com `syncedAt` mais
antigo.

#### Dá para copiar? Os números, da documentação deles (lidos em 09/09/2026)

| | valor |
|---|---|
| Limite normal | **90 requisições por minuto** |
| Limite no estado degradado | **30 por minuto** — é o que a doc anuncia hoje |
| Estouro | 429 e **1 minuto de castigo** |
| Burst limiter | existe, sem números públicos — espaçar os pedidos |
| Página máxima | 50 registros |

A varredura, então, é questão de paciência, não de possibilidade:

| obras | pedidos | a 90/min | a 30/min |
|---|---|---|---|
| 50 mil | 1.000 | ~11 min | ~33 min |
| 100 mil | 2.000 | ~22 min | ~1h10 |
| 200 mil | 4.000 | ~45 min | ~2h15 |

**Quantas obras existem, não sei** — e não dá para medir com a API fora. A
primeira resposta da varredura já diz (`pageInfo.total`), então o próprio
importador descobre e registra antes de continuar.

#### O que a documentação NÃO diz

Não há declaração sobre espelhar, copiar em massa ou raspar o catálogo. Nem
permitindo, nem proibindo. O contato deles é `contact@anilist.co`.

**Recomendação:** espelhar as mais populares primeiro, em faixas, e parar quando
o produto estiver servido — não varrer o acervo inteiro só porque cabe. Se um dia
fizer falta o acervo completo, aí sim vale escrever para eles antes.

#### O limite que aperta primeiro não é o deles, é o nosso

Estimando 1 a 2 KB por obra com sinopse:

| obras | tamanho aproximado |
|---|---|
| 20 mil | 20–40 MB |
| 100 mil | 100–200 MB |
| 200 mil | 200–400 MB |

O plano gratuito do Neon dá **0,5 GB**. O acervo inteiro pode caber, mas deixa
pouca folga para o resto — e o resto é o que importa (estante, avaliações,
progresso). Mais um argumento para o recorte.

## A descoberta que costura as duas fases

**O Kitsu entrega o `anilistId` de cada obra**, no mesmo pedido:

```
GET /api/edge/manga?filter[text]=vagabond&include=mappings
→ anilist/manga = 30656   (o mesmo id que já está no nosso banco)
```

Medido em 09/09/2026, em quatro faixas do acervo: **79 de 80** obras trazem o
`anilistId`, inclusive em `offset=30000`.

Sem isso, obra vinda do Kitsu seria uma linha órfã que o AniList nunca
reconheceria. Com isso:

| | efeito |
|---|---|
| `Media.anilistId` | continua obrigatório, sem coluna nova |
| URLs `/obra/[anilistId]` | continuam iguais |
| Linha gravada na Fase 1 | é a **mesma** que a Fase 2 atualiza |

## Regras específicas

- **Obra sem `anilistId` no Kitsu não entra.** Uma em oitenta na amostra; o custo
  de ignorar é irrelevante perto de criar linha que o espelho nunca alcança.
- **Kitsu nunca é consultado com o AniList de pé.** É fallback, não segunda fonte
  ao vivo: duas fontes ativas são duas formas de falhar e duas modelagens para
  conciliar a cada requisição.
- **Identificar o cliente**: `User-Agent: Kidoku/1.0 (+url)`. Descoberto na marra
  — a primeira bateria de testes levou **403 em tudo** por causa do agente padrão
  do cliente HTTP. Identificar de verdade, nunca fingir ser navegador.
- **Não inventar dado.** O Kitsu não traz país de origem. Ele traz `subtype`, e
  `manhwa`/`manhua` mapeiam para Coreia/China; `manga` **não** implica Japão —
  fica nulo, e a Fase 2 preenche.
- Toda tela ou texto novo nasce nos cinco idiomas.
- TDD para domínio e serviço: a tradução do formato do Kitsu é domínio puro.

## Decisões tomadas

**O espelho é do AniList** (decisão do usuário, 09/09/2026). O Kitsu é tapa-buraco
enquanto o AniList estiver fora, e some do caminho quando ele voltar.

**Sob demanda, não em massa** — consequência direta da decisão acima.

## Pendências

1. **Confirmar se o catálogo passa a ler o banco primeiro** depois da Fase 2. É
   mudança de comportamento visível: a busca passaria a mostrar o nosso espelho, e
   não o AniList ao vivo. Antes da Fase 2 isso não se decide — hoje o banco tem
   quinze obras.
2. **Quantas obras espelhar.** Os números da varredura estão acima; o que falta é
   a decisão de escopo. Recomendação: as mais populares, em faixas, parando quando
   o produto estiver servido. O limite que aperta primeiro é o armazenamento do
   nosso plano, não o deles.
3. **Onde a sincronização roda**: cron da Vercel (o plano Hobby permite pouca
   frequência) ou script à mão. Cron pede rota protegida por segredo.
4. **A Fase 2 depende do AniList voltar.** Não há previsão. A Fase 1 não depende, e
   é o que destrava o uso hoje.

## Referências

- #215 (AniList fora), #165 (o fallback de cache, já feito em 09/09)
- `src/server/infra/anilist.ts`, `src/server/repositories/media.repository.ts`
  (`salvarMediaDoAniList`, `buscarMediasEmCache`)
- `prisma/schema.prisma`, modelo `Media` — `anilistId` é a chave que as duas
  fontes compartilham
- Kitsu: `https://kitsu.io/api/edge/manga`, docs em
  `https://hummingbird-me.github.io/api-docs/`
