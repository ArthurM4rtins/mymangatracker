# Redes sociais do Kidoku — plano de divulgação

Desenho aberto em 10/09/2026. **Aguardando aprovação.**

Pasta nova no vault (`05. Divulgacao`): isto não é implementação, não é regra de negócio e não é
coursework — é presença pública do produto. Se ficar só neste documento, cabe mover para
`01. Faculdade`.

## Objetivo

**Usuários reais.** Gente cadastrando, colocando obra na estante e instalando a extensão — não
seguidor. Decidido pelo usuário em 10/09/2026.

Consequência direta: seguidor não é meta, é meio. Todo post responde "isso faz alguém abrir o
site?". Post que não faz, não entra no calendário.

## Bloqueios técnicos — nada de conta antes disto

Conferido em produção em 10/09/2026, com `curl` na resposta real:

| Achado | Prova | Por que trava |
|---|---|---|
| **Zero tags Open Graph** | `curl -s .../pt-BR \| grep -c "og:"` → `0` | Link do Kidoku colado em Instagram, X, Discord ou WhatsApp aparece como **URL pelada**: sem imagem, sem título, sem descrição. Cada post divulgado queima ali |
| **Zero analytics** | nada no `package.json`, nada no `layout.tsx` | Sem isto nenhum post é mensurável. Não dá para saber se alguém veio, de onde, nem se cadastrou |
| **Favicon do scaffold** | `favicon.ico` responde 200, mas é o herdado | Já é pendência aberta em `identidade-visual/CLAUDE.md` |
| **README intitulado "MyMangaTracker"** | `README.md:1` | O site já é `<title>Kidoku</title>`. Quem chega pelo GitHub vê outro nome |

Produção em si está de pé: `/api/v1/health` → `{"status":"ok"}`. A #210 (`SESSION_SECRET`) está
fechada, dá para entrar e cadastrar.

**Ordem obrigatória:** OG + analytics → reservar handles → postar. Inverter é gastar o lançamento
com link quebrado e sem medição.

## O risco que ninguém levanta e é o mais sério

O diferencial do produto é rastrear leitura em **sites de scan** — MangaFire e MangaDex são os
testados, e estão citados no README e nos docs da extensão.

Divulgar publicamente "acompanhe sua leitura no MangaFire" é, na prática, **anunciar
proximidade com pirataria**, com nome e sobrenome de dois estudantes no README. Isso cria três
problemas concretos:

1. **ToS das plataformas.** Conta que promove acesso a obra não licenciada é derrubável.
2. **Faculdade.** O trabalho é assinado. Print de site de scan num post público é rastreável.
3. **Futuro do produto.** Fecha porta com editora, e conflita com o rumo do acervo próprio (#254).

**Regra proposta, inegociável no conteúdo público:**

- O Kidoku se posiciona como **neutro de fonte**: acompanha a obra, não o site. É verdade
  técnica — "progresso pertence à obra, não ao site" já é regra do domínio.
- **Nenhum post nomeia, linka ou mostra site de scan.** Nem em print, nem em GIF, nem em resposta.
- Print de tela mostra **o Kidoku**, com a URL da barra cortada ou borrada.
- Quando precisar mostrar fonte, usar oficial: Manga Plus, Viz, Crunchyroll, Panini.
- Se alguém perguntar nos comentários "funciona no site X?", a resposta é "funciona em qualquer
  site que tenha o capítulo na URL" — sem confirmar site nenhum pelo nome.

Segundo risco, menor mas real: **capa de mangá é arte protegida**. As capas vêm do AniList/Kitsu.
Postar capa solta como conteúdo é uso de arte de editora. Dentro de print da interface o uso é
contextual e é a norma do nicho; capa isolada e ampliada, não. Preferir sempre o print do app.

## Canais — o que entra e o que fica de fora

Dois estudantes. Quatro plataformas é fantasia; o plano assume **duas ativas + uma de evento**.

| Canal | Papel | Entra? |
|---|---|---|
| **X / Twitter** | Principal. É onde a comunidade de mangá conversa, e onde build-in-public funciona | ✅ |
| **Discord** | Comunidade. Para tracker, é o que transforma curioso em usuário que fica, e é a fonte de feedback | ✅ |
| **Reddit** | Evento, não rotina. 2-3 posts bem cronometrados em r/manga, r/manhwa. Alto retorno, alto risco | ⚠️ regras abaixo |
| **Instagram** | Alcance em PT-BR, mas conversão baixa para utilitário e custo de produção alto | 🕐 fase 3 |
| **TikTok** | Custo de produção não cabe em dois | ❌ |
| **Bluesky** | Comunidade de anime crescendo, custo marginal (cross-post) | ➕ espelho do X |

**Reddit tem regra própria e quebrá-la é banimento, não advertência.** Subs de mangá tratam
autopromoção com rigor: conta nova postando o próprio projeto é removida. O caminho é participar
por semanas antes, ler as regras de cada sub, e postar como "fiz isto, é grátis e open source",
com o repositório à mostra — não como anúncio. **Nunca no dia do lançamento.**

## Handles

`kidoku.app` está ocupado (Kidoku Live, sudoku infantil — nicho sem conflito, já pesquisado em
`identidade-visual/CLAUDE.md`). Então `@kidoku` provavelmente também está.

Ordem de preferência, o **mesmo handle em todas**: `@kidokuapp` → `@usekidoku` → `@kidoku_app`.
Reservar as três plataformas no mesmo dia, mesmo as que só entram na fase 3 — handle é grátis
e some.

## Os quatro pilares de conteúdo

Nenhum é "post motivacional". Cada um puxa para o site.

1. **Utilidade / descoberta** (~40%) — o produto já produz isto: listas públicas, obra bem
   avaliada, "5 manhwas curtos para o fim de semana". O post entrega valor sozinho e o link é
   consequência, não pedido.
2. **Produto** (~30%) — o rastreio automático. GIF de 6 segundos: abre o capítulo, o badge
   acende, a estante avança sozinha. É o diferencial e quase ninguém sabe que existe.
3. **Build in public** (~20%) — o que quebrou, o que foi decidido, por quê. Serve o objetivo de
   usuário **e** a apresentação da faculdade, sem custo extra: o material já existe no vault.
4. **Comunidade** (~10%) — enquete, "em que capítulo você parou e nunca voltou?". Barato, gera
   resposta, e resposta é o que o algoritmo do X premia.

## Cadência realista

- **X:** 4 posts/semana. Produzidos **em lote no domingo**, agendados. Postar no impulso não
  sobrevive à semana de prova.
- **Discord:** presença diária de 10 minutos, não postagem.
- **Reddit:** 1 post a cada 3-4 semanas, no máximo.
- **Regra de sobrevivência:** semana sem lote pronto no domingo = semana sem post. Silêncio
  planejado é melhor que conta que morre no mês 2.

## Divisão entre os dois

Sem dono, não sai. Proposta:

- **Arthur** — pilar 1 e 4 (curadoria e comunidade), moderação do Discord.
- **Nicholas** — pilar 2 e 3 (produto e build-in-public), GIFs e prints.
- Lote de domingo: os dois, 40 minutos, juntos.

## Medição — o número que importa

Seguidor não conta. O funil é:

```
visita → cadastro → 1 obra na estante → 1 fonte configurada → extensão instalada
```

**A métrica é a terceira etapa: cadastro que colocou pelo menos uma obra na estante.** É o
menor sinal de que a pessoa entendeu o produto. Seguidor sem isso é ruído.

Instrumentação mínima:

- Vercel Analytics (uma linha, plano gratuito, sem cookie — evita banner de LGPD).
- `?utm_source=` em todo link postado, um por canal, para separar de onde veio.
- Contagem semanal manual das etapas do funil no banco. Semanal, não diária — diária vira ansiedade.

## Fases

**Fase 0 — destravar (antes de qualquer conta)**
OG tags + `opengraph-image` (Next tem convenção de arquivo) · Vercel Analytics · favicon
double-check · README renomeado para Kidoku. Cada um vira issue.

**Fase 1 — reservar**
Handles no X, Discord, Instagram e Bluesky, mesmo nome, mesma foto (double-check), mesma bio.
Sem postar.

**Fase 2 — ligar (4 semanas)**
X e Discord ativos, lote semanal, os quatro pilares. Meta: **não** número de seguidor, e sim o
lote de domingo acontecendo 4 domingos seguidos. Se falhar aí, o resto do plano é fantasia.

**Fase 3 — abrir**
Só depois das 4 semanas: Reddit (com conta já participante), Instagram, e avaliação honesta do
que mediu alguma coisa. O que não mediu, morre — sem apego.

## Decisões tomadas

1. **Nome é Kidoku** (usuário, 10/09/2026). O repo continua `mymangatracker`; a marca é
   independente do repositório, como já estava decidido em `identidade-visual/CLAUDE.md`.
2. **Objetivo é usuário real**, não nota. Métrica é ativação, não seguidor.
3. **Nenhum site de scan é nomeado, linkado ou mostrado** em conteúdo público. Posicionamento é
   neutro de fonte, e isso é verdade técnica, não desculpa.
4. **Duas plataformas ativas**, não quatro. Reddit é evento.
5. **Nada de conta antes de OG e analytics.** Link sem preview e post sem medição desperdiçam o
   único lançamento que existe.
6. **Não ecoar o Letterboxd**, nem no visual nem no texto. A regra de `tasks/lessons.md` vale
   aqui também — e as issues #257/#259 já tiraram a comparação do rodapé e do README.

## Pendências

1. **Domínio.** `kidoku.app` está ocupado. Para "usuários reais", `mymangatracker.vercel.app` na
   bio custa confiança. Recomendação: comprar `kidoku.moe` ou `kidoku.com.br` **antes da fase 1**
   — disponibilidade ainda não verificada por mim. Se não comprar, aceitar conscientemente.
2. **Quando reservar os handles.** O usuário fechou o nome mas não a hora. Recomendação:
   **reservar já**, publicar só na fase 2. Handle é grátis, atraso não é.
3. **Concorrência.** Existe pelo menos um tracker de mangá com extensão (Kenmei). **Não conferi**
   o que ele faz hoje — conferir antes de escrever bio e posicionamento, para não anunciar como
   inédito algo que já existe. Prometer diferencial que não é diferencial queima a conta.
4. **Idioma dos posts.** O site nasce em 5 idiomas; a conta não precisa. Recomendação: **só
   PT-BR** na fase 2. Conta bilíngue com dois estudantes fica ruim nos dois.
5. **Nomes reais.** README expõe os dois integrantes. Decidir se as contas assinam com nome ou
   só com a marca — muda o que é seguro postar.
6. **Suporte.** Usuário real manda DM com bug. Quem responde, em quanto tempo, e o que vira
   issue? Sem isso, a primeira semana de tração vira caos.

## Referências

- `identidade-visual/CLAUDE.md` — nome, logo double-check, temas, pesquisa de conflito do nome
- `tasks/lessons.md` — regra de não ecoar o Letterboxd
- #257, #259 — comparação com Letterboxd tirada do rodapé e do README
- #254 — acervo próprio, que muda o discurso de fonte
- `feature-pwa-compartilhar/CLAUDE.md` (#264) — o celular, que é onde o público das redes está
- `README.md` — o texto do problema, matéria-prima pronta para o pilar 3
