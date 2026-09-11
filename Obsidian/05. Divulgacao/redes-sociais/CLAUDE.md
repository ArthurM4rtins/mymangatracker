# Redes sociais do Folunio — plano de divulgação

Desenho aberto em 10/09/2026, **revisado em 11/09/2026** depois do rebranding (#268). A revisão não
foi troca de nome: reconferiu cada fato em produção, achou uma contradição interna do próprio plano
e mudou quatro decisões. O que mudou está marcado com **11/09** ao longo do texto.

Pasta nova no vault (`05. Divulgacao`): isto não é implementação, não é regra de negócio e não é
coursework — é presença pública do produto.

## Objetivo

**Usuários reais.** Gente cadastrando, colocando obra na estante e instalando a extensão — não
seguidor. Decidido pelo usuário em 10/09/2026.

Consequência direta: seguidor não é meta, é meio. Todo post responde "isso faz alguém abrir o
site?". Post que não faz, não entra no calendário.

## Bloqueios técnicos — nada de conta antes disto

Reconferido em produção em **11/09/2026**, com `curl` na resposta real. **Nenhum dos bloqueios de
10/09 foi destravado**, e a revisão achou mais três.

| Achado | Prova | Por que trava |
|---|---|---|
| **Zero tags Open Graph** | `curl -s .../pt-BR \| grep -c "og:"` → `0`; `grep -c "twitter:"` → `0` | Link do Folunio colado em Instagram, X, Discord ou WhatsApp aparece como **URL pelada**: sem imagem, sem título, sem descrição. Cada post divulgado queima ali |
| **Zero analytics** | nada no `package.json`, nada no `layout.tsx` | Sem isto nenhum post é mensurável. Não dá para saber se alguém veio, de onde, nem se cadastrou |
| **Favicon do scaffold** | O blob de `src/app/favicon.ico` tem 25.931 bytes, nasceu no commit "Esqueleto do Next.js" de 27/08, e produção serve **exatamente esses bytes** (sha256 idêntico) | O site tem marca nova e o ícone da aba é o do template. A extensão ganhou ícone próprio em 11/09; o site não |
| **README sem a marca** | `README.md` tem **0** ocorrências de "Folunio" e ainda se intitula "MyMangaTracker" | O site já é `<title>Folunio</title>`. Quem chega pelo GitHub vê outro nome. E o README descreve stack defasada: diz que o catálogo é AniList, quando hoje é Kitsu |
| **Sem Termos de uso nem Privacidade** — *novo em 11/09* | `git ls-tree origin/main -- "src/app/(ui)"` não acha `sobre`, `termos` nem `privacidade`. **#249 aberta** | O objetivo é cadastro de gente real: conta, senha e histórico de leitura em PT-BR. Divulgar isso sem política de privacidade é o pior buraco possível num produto cujo argumento é **privado** — e é na página de Privacidade que a invariante de progresso privado do dono deve estar escrita |
| **Sem `robots.txt` nem `sitemap.xml`** — *novo em 11/09* | Os dois respondem **404** | Tráfego de rede social é pico curto; busca é o que sustenta depois. Sem sitemap o site não é indexado direito |
| **A home não emite `hreflang` nem `canonical`** — *novo em 11/09* | `/pt-BR` tem `<meta name="description">` mas zero `<link rel="alternate\|canonical">`; `/pt-BR/catalogo` emite os 6 | A home é exatamente a página que todo post vai linkar |

Produção em si está de pé: `/api/v1/health` → `{"status":"ok"}`, e o rebranding está no ar nos
cinco idiomas.

**Ordem obrigatória:** destravar a fase 0 → reservar handles → postar. Inverter é gastar o
lançamento com link quebrado e sem medição.

**Atenção ao `opengraph-image`:** a rota sem locale cai no redirect do `src/proxy.ts`. Hoje
`/opengraph-image` responde **307** e `/pt-BR/opengraph-image` responde **404** — a convenção de
arquivo do Next tem que nascer sob `[locale]`, ou a tag aponta para o nada.

**O ferramental já existe.** O rebranding de 11/09 destravou metade disso sem querer: os PNG do
ícone da extensão saíram do SVG com o `sharp` que já vem na árvore do Next, e o comando está
registrado em `extension/README.md`. **Favicon e imagem de OG saem pelo mesmo caminho**, a partir
de `extension/icones/folha-orbita.svg` e do wordmark de `logo.tsx`.

## O risco que ninguém levanta e é o mais sério

O diferencial do produto é rastrear leitura em **sites de scan** — MangaFire e MangaDex são os
testados.

Divulgar publicamente "acompanhe sua leitura no MangaFire" é, na prática, **anunciar proximidade
com pirataria**, com nome e sobrenome de dois estudantes no README. Isso cria três problemas
concretos:

1. **ToS das plataformas.** Conta que promove acesso a obra não licenciada é derrubável.
2. **Faculdade.** O trabalho é assinado. Print de site de scan num post público é rastreável.
3. **Futuro do produto.** Fecha porta com editora, e conflita com o rumo do acervo próprio.

**Onde os nomes realmente estão — corrigido em 11/09.** A versão de 10/09 dizia "estão citados no
README e nos docs da extensão". A primeira metade é **falsa**: o `README.md` da raiz não cita
nenhum dos dois. As citações versionadas e públicas estão em `extension/comum.js`,
`extension/background.js`, `extension/README.md`, `src/server/domain/obra-do-titulo.ts`,
`src/server/domain/story-structure.ts`, `data/story-structures/README.md`,
`data/story-structures/titles/30002.json` (**URL completa do MangaDex**), `messages/revisao/fr.md`
e seis documentos do vault — mais de 30 ocorrências em 14 arquivos.

**E o repositório é público.** Qualquer pessoa alcança
`feature-extensao-navegador/CLAUDE.md`, que traz `mangafire.to/title/.../chapter/...` por extenso,
sem login. **Este plano também é público**, então a seção que descreve o risco está publicada junto
com ele.

**Regra, inegociável no conteúdo público:**

- O Folunio se posiciona como **neutro de fonte**: acompanha a obra, não o site. É verdade
  técnica — "progresso pertence à obra, não ao site" já é regra do domínio.
- **Nenhum post nomeia, linka ou mostra site de scan.** Nem em print, nem em GIF, nem em resposta.
- **Nenhum post linka o repositório** — decisão de 11/09, ver decisão 7. Mostrar o repo é, hoje,
  linkar site de scan.
- Quando precisar mostrar fonte, usar oficial: Manga Plus, Viz, Crunchyroll, Panini.
- Se alguém perguntar nos comentários "funciona no site X?", a resposta é "funciona em qualquer
  site que tenha o capítulo na URL" — sem confirmar site nenhum pelo nome.

### Print e GIF: a regra de 10/09 era tecnicamente insuficiente

Dizia "print mostra o app, com a URL da barra cortada ou borrada". **Cortar a barra não basta.** O
app renderiza o host da fonte como **texto visível**: `messages/pt-BR.json` traz
`"cap. {capitulo} em {host}"`, usado em `estante/continuar-leitura.tsx`, e o botão "Continuar" é um
`<a href>` apontando para a URL do capítulo no site real.

**Regra corrigida:** print e GIF saem sempre de uma **conta de demonstração com fonte fabricada** —
`https://leitura.exemplo/titulo/x/capitulo/94` ou equivalente. Isso funciona porque
`src/server/domain/url-visitada.ts` valida só esquema, tamanho e ausência de credencial embutida,
**sem allowlist de host**: fonte inventada atravessa o app inteiro e produz material limpo.

Segundo risco, menor mas real: **capa de mangá é arte protegida**. As capas vêm do Kitsu. Postar
capa solta como conteúdo é uso de arte de editora. Dentro de print da interface o uso é contextual
e é a norma do nicho; capa isolada e ampliada, não. Preferir sempre o print do app.

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
por semanas antes, ler as regras de cada sub, e postar como "fiz isto, é grátis" — não como
anúncio. **Nunca no dia do lançamento.**

**Mudança de 11/09:** a versão anterior mandava postar "com o repositório à mostra". Isso
contradizia a decisão 3 deste mesmo plano, porque o repo é público e nomeia site de scan por
extenso. **O link do repositório sai da tática** — ver decisão 7.

## Handles

**Domínio limpo, handle não.** Reconferido em 11/09/2026, consulta anônima, com controle positivo
em cada endpoint:

| Alvo | Estado | Como foi provado |
|---|---|---|
| `folunio.com`, `.net`, `.org`, `.app` | **sem registro** | RDAP → 404; controle `google.com` no mesmo endpoint → 200 |
| `folunio.com.br` | **disponível** | `rdap.registro.br` → 404 e o serviço oficial de disponibilidade → `status: 0`; controle `google.com.br` → `status: 2` |
| `folunio.bsky.social` | **livre** | `resolveHandle` da API do Bluesky não resolve; controle `bsky.app` devolve DID |
| **`@folunio` no X** | **recusado pelo cadastro** | ver abaixo |
| `github.com/folunio` | **ocupado** | conta dormente criada em 20/11/2017, perfil vazio, 0 repositórios, nunca atualizada. Usuário e organização dividem namespace, então a org `folunio` está fora |
| `@folunio` no Instagram | **inconclusivo** | consulta anônima devolve o mesmo muro de login para handle real, inventado ou inexistente. Só fecha logado |

### O handle exato é a preferência, e está bloqueado

**A intenção do usuário é `@Folunio`, sem sufixo** (11/09). O endpoint de disponibilidade que o
próprio formulário de cadastro do X usa recusa o nome:

```
folunio    → is_banned_word      folunios   → available
foluni     → is_banned_word      folunio1   → available
                                 foluniobr  → available
```

**Cuidado com a leitura desse código.** Ele *não* quer dizer "palavra proibida": o mesmo
`is_banned_word` volta para `github`, `manga` e `leitura`, enquanto `twitter` e `admin` devolvem
`contains_banned_word` e `elonmusk` devolve `taken`. É o balde genérico do X para **indisponível
sem dizer por quê** — reservado, suspenso, ou preso em conta desativada. Qualquer caractere a mais
libera.

**O que fazer, nesta ordem:**

1. **Confirmar no formulário real** do X, digitando `Folunio`. É a diferença entre o nome exato e
   um sufixo no rosto da marca, e custa dois minutos. O endpoint é legado e não documentado.
2. Se confirmar a recusa, escolher entre `@folunioapp`, `@usefolunio` e `@getfolunio` — os três
   voltaram `available` no X, e os dois primeiros também estão livres no GitHub.
3. Reservar **o mesmo handle nas quatro plataformas no mesmo dia**, mesmo as que só entram na
   fase 3. Handle é grátis e some.

**Decisão pendente**, porque amarra as quatro plataformas de uma vez.

## Os quatro pilares de conteúdo

Nenhum é "post motivacional". Cada um puxa para o site.

1. **Utilidade / descoberta** (~40%) — o produto já produz isto: listas públicas, obra bem
   avaliada, "5 manhwas curtos para o fim de semana". O post entrega valor sozinho e o link é
   consequência, não pedido.
2. **Produto** (~30%) — o rastreio automático. GIF de 6 segundos: abre o capítulo, o badge acende,
   a estante avança sozinha. É o diferencial e quase ninguém sabe que existe.
   **Duas condições, novas em 11/09:** o GIF filma exatamente a superfície que entrega a fonte, e
   por isso só é gravável com **obra e fonte fabricadas**, combinadas antes de ligar a gravação. E
   só depois da extensão publicada na Chrome Web Store — senão o melhor material do produto queima
   sem lugar para instalar.
3. **Build in public** (~20%) — o que quebrou, o que foi decidido, por quê. Serve o objetivo de
   usuário **e** a apresentação da faculdade, sem custo extra: o material já existe no vault.
4. **Comunidade** (~10%) — enquete e conversa. Barato, gera resposta, e resposta é o que o
   algoritmo do X premia.
   **Corrigido em 11/09:** a enquete de 10/09 era "em que capítulo você parou e nunca voltou?", e
   isso pede ao usuário que publique **progresso de leitura** — o dado que o sistema trata como
   privado do dono e nunca expõe. Um tracker que vende privacidade pedindo "conte em que capítulo
   você está" argumenta contra si mesmo. Nenhuma peça de comunidade pede progresso: usar o que é
   público por desenho — **nota, resenha e lista**. Ex.: "qual obra você largou e se arrepende?".

### Material que o rebranding entregou — novo em 11/09

O rebranding produziu ativo de marca que o plano de 10/09 não conhecia, e ele é matéria-prima de
pilar 3 (build in public):

- **O wordmark** tem folha no primeiro *o* e planeta no último — Folha + Universo, o significado do
  nome desenhado dentro da palavra.
- **O par de kanji 葉宙** (葉 folha, 宙 espaço aberto) carrega os mesmos dois sentidos.
- **O ícone da extensão é a folha em órbita**, e ele **não** é um visto de propósito: o Chrome
  carimba o próprio badge por cima do ícone, e o badge de "registrado" já é um ✓ verde. Marca com
  visto mais badge com visto seriam duas afirmações do mesmo tipo em 16 px.
- **A história da troca de nome** — o nome anterior colidia com outro tracker de leitura na mesma
  categoria, achado numa pesquisa que está versionada em `pesquisa-nome-kidoku-2026-09-10.md`.

Todas essas são histórias de produto que não tocam em fonte nenhuma, então passam na regra de
neutralidade sem ajuste. **O que não vira post:** a URL do site de scan que aparece nos testes, e
qualquer print que mostre a estante de uma conta real.

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

**A métrica é a terceira etapa: cadastro que colocou pelo menos uma obra na estante.** É o menor
sinal de que a pessoa entendeu o produto. Seguidor sem isso é ruído.

Instrumentação mínima:

- Vercel Analytics (uma linha, plano gratuito, sem cookie — evita banner de LGPD).
- `?utm_source=` em todo link postado, um por canal, para separar de onde veio.
- Contagem semanal manual das etapas do funil no banco. Semanal, não diária — diária vira ansiedade.

## Fases

**Fase 0 — destravar (antes de qualquer conta)** · *revisada em 11/09*

- OG tags + `opengraph-image` **sob `[locale]`** (a rota sem locale cai no redirect do proxy)
- Vercel Analytics
- Favicon próprio, substituindo os bytes do scaffold — sai do mesmo SVG do ícone da extensão
- `robots.ts` e `sitemap.ts`, hoje 404
- `generateMetadata` na home, hoje a única tela sem `hreflang` e sem canonical
- README e **descrição do repositório no GitHub** renomeados para Folunio, e sem "Letterboxd"
- **#249 — Sobre, Termos de uso e Privacidade** (ver decisão 8)

**Nenhum destes tem issue aberta, exceto a #249.** Cada um vira issue própria.

**Fase 1 — reservar**
Handles no X, Discord, Instagram e Bluesky, mesmo nome, mesma foto (a folha em órbita), mesma bio.
Sem postar. **Depende de fechar o handle** — ver a seção Handles.

**Fase 2 — ligar (4 semanas)**
X e Discord ativos, lote semanal, os quatro pilares. Meta: **não** número de seguidor, e sim o lote
de domingo acontecendo 4 domingos seguidos. Se falhar aí, o resto do plano é fantasia.

**Fase 3 — abrir**
Só depois das 4 semanas: Reddit (com conta já participante), Instagram, e avaliação honesta do que
mediu alguma coisa. O que não mediu, morre — sem apego. **Depende da pendência 5** (nome dos
integrantes).

## Decisões tomadas

1. **Nome é Folunio** (usuário, 11/09/2026, #268). O rebranding está aplicado e em produção. O repo
   continua `mymangatracker`; a marca é independente do repositório.
2. **Objetivo é usuário real**, não nota. Métrica é ativação, não seguidor.
3. **Nenhum site de scan é nomeado, linkado ou mostrado** em conteúdo público. Posicionamento é
   neutro de fonte, e isso é verdade técnica, não desculpa.
4. **Duas plataformas ativas**, não quatro. Reddit é evento.
5. **Nada de conta antes da fase 0.** Link sem preview e post sem medição desperdiçam o único
   lançamento que existe.
6. **Não ecoar o Letterboxd**, nem no visual nem no texto. A regra registrada em `tasks/lessons.md`
   cobre só o **visual** ("benchmark de produto, não de estética"); a extensão ao texto é decisão
   deste plano. As issues #257 e #259 tiraram a comparação do rodapé e do README, mas **ela
   continua em três lugares públicos**, conferidos em 11/09: a descrição do repositório no GitHub,
   o `CLAUDE.md` da raiz e a apresentação da faculdade em `01. Faculdade/apresentacao/`.
7. **Nenhum post linka o repositório** (usuário, 11/09/2026). Mostrar o repo é linkar site de scan,
   porque ele é público e traz URL completa de MangaFire e MangaDex. A tática de Reddit continua,
   sem o link. Não houve reescrita de histórico e nenhuma citação foi apagada — a rastreabilidade
   da decisão técnica fica, o link é que não sai em post.
8. **#249 é bloqueio da fase 0** (usuário, 11/09/2026). Nada de campanha de cadastro antes de
   existir Termos de uso e Privacidade. O produto pede conta, senha e histórico de leitura de gente
   real em PT-BR, e vende privacidade como diferencial.
9. **Nenhuma peça de comunidade pede progresso de leitura** (usuário, 11/09/2026). Usar nota,
   resenha e lista, que são públicos por desenho.

## Pendências

1. **Handle.** `@Folunio` é a preferência do usuário e o cadastro anônimo do X recusa. Confirmar no
   formulário real antes de desistir; se confirmar, escolher entre `@folunioapp`, `@usefolunio` e
   `@getfolunio`. A escolha amarra as quatro plataformas, porque a regra é o mesmo handle em todas.
2. **Domínio.** `folunio.com`, `.net`, `.org`, `.app` e `.com.br` sem registro em 11/09 — RDAP não
   informa preço, condição premium nem reserva de registrador. Recomendação: decidir **antes da
   fase 1**. Custo escondido: o endereço está cravado em `extension/manifest.json`
   (`host_permissions`) e no User-Agent de `src/server/infra/kitsu.ts`, e a extensão ainda não foi
   submetida à loja — trocar o domínio depois da submissão custa nova revisão. **Ordem rígida:
   domínio → manifest → loja → post de produto.**
3. **Concorrência.** Existe pelo menos um tracker de mangá com extensão (Kenmei), e existe o
   `kidoku.net` que forçou a troca de nome. **Não conferi** o que nenhum dos dois faz hoje —
   conferir antes de escrever bio e posicionamento, para não anunciar como inédito algo que já
   existe.
4. **Idioma dos posts.** O site nasce em 5 idiomas; a conta não precisa. Recomendação: **só PT-BR**
   na fase 2. Conta bilíngue com dois estudantes fica ruim nos dois.
5. **Nomes reais — agora é pré-requisito, não ajuste posterior.** `README.md` nomeia os dois por
   extenso, e a seção de risco deste plano trata isso como agravante do problema de proximidade com
   pirataria. Decidir se as contas assinam com nome ou só com a marca é **pré-requisito da fase 3**.
   A reescrita do README na fase 0 é a hora barata: o arquivo vai ser tocado de qualquer jeito.
6. **Suporte.** Usuário real manda DM com bug. Quem responde, em quanto tempo, e o que vira issue?
   Sem isso, a primeira semana de tração vira caos.
7. **Instagram sem resposta** — *nova em 11/09*. É uma das plataformas da fase 1 e nenhuma consulta
   anônima separa handle existente de inexistente lá. Só fecha logado. Enquanto não for feito, o
   handle do Instagram não pode ser tratado como resolvido.
8. **A conta de demonstração com fonte fabricada não existe** — *nova em 11/09*. Print, GIF e a
   futura tela de tutorial da extensão dependem dela. Criar antes da fase 2, com obra e fonte
   inventadas, e usar sempre a mesma para o material sair consistente.

## Referências

- `../rebrand-folunio.md` — o rebranding, o roteiro e as armadilhas medidas
- `pesquisa-nome-kidoku-2026-09-10.md` — a pesquisa de nome, domínio, handle e INPI
- `../../02. Implementacoes/identidade-visual/CLAUDE.md` — nome, logo, temas, e o histórico da troca
- `../../02. Implementacoes/identidade-visual/identidade-aplicada.html` — o estudo da identidade
  aplicada: símbolo, kanji, wordmark, paleta
- `tasks/lessons.md` — a regra de não ecoar o Letterboxd, no visual
- #257, #259 — comparação com Letterboxd tirada do rodapé e do README
- #249 — Sobre, Termos de uso e Privacidade, bloqueio da fase 0
- `../../02. Implementacoes/feature-pwa-compartilhar/CLAUDE.md` (#264) — o celular, que é onde o
  público das redes está
- `extension/README.md` — como gerar PNG a partir do SVG, que serve para favicon e imagem de OG
