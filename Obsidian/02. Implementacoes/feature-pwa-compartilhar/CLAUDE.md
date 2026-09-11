# PWA com Share Target — registrar leitura pelo celular

Issue #264. Desenho aberto e aprovado em 10/09/2026.

Revisão adicional em 10/09/2026: ver [Análise do Codex](#análise-do-codex--10092026).
Essa seção distingue os achados e as recomendações do Codex das decisões originais acima dela.

**Este documento já foi corrigido pelos achados dessa revisão** (10/09/2026, conferidos um a um
no código). O que mudou e por quê está em [Resolução da revisão](#resolução-da-revisão--10092026),
depois da seção do Codex. A seção do Codex ficou intacta, como foi escrita.

## Objetivo

A extensão registra o capítulo sozinho no desktop (#173) e **não existe no celular**: Chrome
Android nunca suportou extensão, Kiwi morreu em 2024. Quem lê no telefone só tem o caminho
manual da estante — digitar o número de cabeça.

Objetivo: dar ao celular um caminho de registro que **não peça o número** e que grave a URL
real, instalando o Kidoku como PWA e recebendo o capítulo pela folha de compartilhar do Android.

## O que é impossível, e por quê

Não é questão de esforço. O núcleo da extensão é ler URL e título de **outra aba**, e nenhuma
página web pode fazer isso — sandbox de origem, sem `chrome.tabs`, sem observar navegação alheia.

Morrem no celular, sem substituto:

- **Badge `●`/`✓` na aba** — não existe aba de terceiro para pintar.
- **Auto-registro sem clique (#173)** — sem observar navegação, sem os 20 segundos de permanência.

Sobrevive tudo o mais: sessão, estante, `capituloDoTitulo`, `chaveDaObra`, pareamento e o
`POST /api/v1/leitura`.

## O fluxo da pessoa

Instalação, **uma vez**: abre o site no Chrome do celular → menu → "Instalar app" → abre pelo
ícone e faz login. A partir daí o Kidoku aparece na folha de compartilhar.

Por capítulo, o custo **não é fixo**: depende de quanto o Kidoku já sabe daquela obra. O que
manda é de onde sai o número do capítulo.

**De onde sai o capítulo, em ordem:**

1. **Reversão do template** (`ReadingSource.urlTemplate`) — certeza, sem palpite. Exige obra
   pareada e fonte configurada cujo template case com a URL compartilhada.
2. **Título** (`capituloDoTitulo`) — exige que o compartilhamento tenha trazido título.
3. **Nada** → campo vazio. Nunca chuta.

| Situação | O que a pessoa faz | Digita? |
|---|---|---|
| Obra pareada **e** fonte configurada que casa com a URL | Compartilhar → Kidoku → **Registrar** | não |
| Obra pareada, sem fonte, mas o título veio com o capítulo | Compartilhar → Kidoku → **Registrar** | não |
| Obra pareada, sem fonte e sem título (Mihon cru) | Compartilhar → Kidoku → digitar o capítulo → **Registrar** | sim |
| **Primeira vez** naquela obra (sem par) | Compartilhar → Kidoku → escolher a obra na estante → conferir capítulo → **Registrar** | escolhe a obra |
| URL opaca sem número nenhum (MangaDex `/chapter/<uuid>`) sem título | Compartilhar → Kidoku → escolher/conferir → digitar | sim |
| Sessão expirada | Compartilhar → login → **volta com o compartilhamento preservado** → Registrar | não |
| Capítulo já registrado | Compartilhar → tela diz "sua estante já está no 57" | nada a fazer |

A primeira vez em cada obra é a cara: escolher na estante. Da segunda em diante o par está
salvo e o custo cai. É o mesmo contrato da extensão — parear uma vez, colher sempre.

Hoje o caminho manual custa 8 ações **e** exige lembrar em que capítulo estava. Mesmo a linha
mais cara desta tabela não pede isso: o número vem preenchido ou o campo abre com a obra certa.

O app nativo é ganho que a extensão nem alcança: a folha do Android pega app nativo, o
navegador do desktop não.

## Ganho que não é conforto

`editar-progresso.tsx` faz `PATCH /api/v1/estante/:id` mandando **só o capítulo**, sem URL.
O botão "Continuar" lê a última abertura registrada (#170). Então quem atualiza na mão pelo
celular avança o número e deixa o "Continuar" **congelado**.

O compartilhar cai em `POST /api/v1/leitura`, que leva `url` junto. Registrar pelo celular
alimenta o "Continuar", coisa que o caminho manual de hoje não faz.

**Com um limite, e ele não é opcional na promessa:** `leitura-externa.service.ts:126` só grava
o que **avança**, e a rota devolve `409` (`route.ts:109`) quando não avança. Então quem marcou
57 na mão e depois compartilha a URL do 57 **não** conserta nada — a estante já está no 57, o
registro é recusado e o "Continuar" segue como estava. Conserta do 58 em diante.

Ou seja: a feature destrava o "Continuar" **daqui pra frente**, não retroativamente. Prometer
mais que isso é prometer o que o serviço não faz.

## Escopo

Dentro:

- `src/app/manifest.ts` — na **raiz** de `app/`, fora de `(ui)/[locale]`.
- Service worker mínimo (`public/sw.js`) + registro. Sem `next-pwa`: vive atrasado em relação ao Next.
- Ícones 192 e 512.
- `domain/template-de-capitulo.ts` — reversão do `urlTemplate`, **teste antes** (TDD-first).
- Leitura da fonte ativa da obra pela camada de serviço (ver decisão 3, relaxada).
- Normalizador do payload compartilhado.
- Tela `/leitura`, incluindo o `409` como resposta normal, não como erro.
- **Retorno do login preservando o compartilhamento** — hoje `entrar/formulario.tsx:73` sempre
  manda para `/`.
- Textos nos 5 idiomas (`pt-BR`, `en`, `es`, `fr`, `de`).

Fora:

- **Mudança de contrato de API.** Rota, DTO e status ficam como estão. Função nova de leitura na
  camada de serviço está dentro (decisão 3).
- **Adivinhar capítulo por URL sem template.** Ver a regra específica: número em URL pode ser ID.
- iOS além do campo de colar. Safari não implementa Share Target; não há o que fazer do nosso lado.
- Mexer na extensão.

## Regras específicas

### Declaração no manifest

Next 16.3.3 já tipa `share_target` em `MetadataRoute.Manifest`
(`node_modules/next/dist/lib/metadata/types/manifest-types.d.ts:52`). Sem lib.

```ts
share_target: {
  action: "/leitura",
  method: "get",
  params: { title: "title", text: "text", url: "url" },
}
```

`params` mapeia campo do sistema → nome do query param recebido.

### Por que GET e não POST

**Correção de 10/09** — a justificativa anterior dizia que POST "exige service worker". É falso:
o servidor pode receber o POST direto, e a codificação nem sempre é `multipart/form-data`.

O motivo real é outro: **`page.tsx` do App Router não atende POST.** Receber por POST exigiria um
route handler aceitando o form, guardando o payload e devolvendo um `303` para a tela — mais
peças, mesmo resultado. GET é query param puro, a página lê e pronto. POST só compensaria para
receber arquivo (`params.files`), que não é o caso.

### O proxy de idioma já resolve sozinho

O matcher de `src/proxy.ts` é `/((?!api|_next|_vercel|.*[.].*).*)`. `/manifest.webmanifest` e
`/sw.js` têm ponto, então escapam do redirect. `/leitura` sem locale cai no redirect do
next-intl preservando a query. **Nada a mexer no proxy** — e nada a dar como certo sem provar:
a lição dos portões vale, conferir com `curl` na resposta real.

### O payload NÃO é confiável

`title`/`text`/`url` variam conforme o app que compartilhou:

**Nenhum campo é garantido**, e essa é a regra, não a exceção. A tabela abaixo é o que se
observou/espera, não contrato:

| Origem | O que costuma vir |
|---|---|
| Chrome Android, Compartilhar da página | `title` = título da página, `url` = URL |
| Mihon/Tachiyomi | `text` = só a URL, `title` vazio (`EXTRA_TEXT` sem `EXTRA_SUBJECT`) |
| Alguns apps | `text` = `"Título https://..."` grudado |

A URL pode chegar em `url`, em `text` **ou em `title`** — nenhum dos três está prometido. Então
o normalizador olha os **três** campos sempre, nunca confia na posição: procura a primeira
`https?://` em qualquer um deles, e o que sobra vira candidato a título.

### Capítulo pela URL — NÃO adivinhar

**Correção de 10/09. A versão anterior deste documento estava errada aqui**, com exemplos
inventados que nunca foram medidos. Ficam registrados porque alguém poderia implementar em cima:

```
❌ capituloDaUrl("https://mangafire.to/read/vagabond/chapter-57") → 57   # formato não existe
```

`src/server/domain/titulo-de-capitulo.ts:6-8` documenta o contrário: no MangaFire a URL é
**opaca** (`/chapter/4745884`) e esse número é **ID interno**, não capítulo — a URL de teste
registrada em `feature-extensao-navegador/CLAUDE.md` corresponde ao capítulo 2.

O agravante: o teto do domínio é `999999.99`, então `4745884` seria barrado por tamanho, **mas um
ID de cinco dígitos passa** e grava progresso errado **para cima**, em silêncio. É exatamente o
risco que a #173 passou a tarefa inteira tentando fechar. Adivinhar número em URL está **fora do
escopo**, e lista de hosts confiáveis também: é o hardcode por site que `titulo-de-capitulo.ts`
evitou de propósito.

### O que substitui: reverter o `urlTemplate`

A informação já existe no banco e foi a **própria pessoa** quem deu. Ao configurar a fonte da
obra, ela confirmou o formato — `"/title/Vinland-Saga/chapter/{chapter}/1"`.

Reverter esse template contra a URL compartilhada dá o capítulo **com certeza**: sem palpite, sem
lista de host, sem confundir ID com capítulo.

```
template "/title/Vinland-Saga/chapter/{chapter}/1"
+ url    "/title/Vinland-Saga/chapter/58/1"        → 58
+ url    "/title/Outra-Obra/chapter/58/1"          → null  (não casa)
+ url    "https://mangadex.org/chapter/<uuid>"     → null  (não casa)
```

Requisitos, todos obrigatórios: obra **pareada** (o par dá o `entradaId` → `mediaId`), fonte
ativa configurada para essa obra, e a URL casando com o template. Faltou qualquer um → `null` →
cai no título → e se o título também não tiver, **campo vazio**. A regra de nunca chutar é a
mesma de sempre.

Ordem de precedência: **template primeiro** (é certeza), título depois (é heurística boa),
vazio por último.

Isso não cobre site sem fonte configurada — e não deve cobrir. Quem lê num site que nunca
configurou digita o número uma vez; é menos trabalho que corrigir progresso errado.

### Auth: a API não muda, a TELA muda

`src/app/api/v1/_shared/sessao.ts:100` lê o cookie **primeiro**, Bearer só como fallback. O
cookie é `sameSite: "lax"` + `httpOnly`, e navegação top-level GET manda ele. A PWA não toca em
token: some toda a ginástica de `chrome.cookies` + `Authorization: Bearer` da extensão.

**Mas "zero mudança" era cedo demais.** `src/app/(ui)/[locale]/entrar/formulario.tsx:73` faz
`roteador.push("/")` **sempre**, sem destino de retorno. Quem compartilha com a sessão vencida
cai no login, entra, e **perde o compartilhamento** — precisa voltar ao capítulo e compartilhar
de novo. Numa PWA em `standalone`, isso é o suficiente para a pessoa desistir.

Está no escopo: preservar o payload durante o login e retomar a confirmação. É trabalho de
**interface**, não de autenticação — a API continua intacta.

### Duplicação que morre

`extension/comum.js:17` reescreve à mão a regex de `domain/titulo-de-capitulo.ts`, com o
comentário admitindo "Se uma mudar, a outra muda junto". A PWA importa o domínio de verdade.

## Decisões tomadas

1. **PWA não substitui a extensão.** Desktop = automático; celular = compartilhar. Mesma API,
   mesmo domínio, mesmo pareamento. Não competem.
2. **GET, não POST** — porque `page.tsx` não atende POST, não porque POST exija service worker.
3. **Contrato de API não muda; a camada de serviço ganha uma leitura.** *(relaxada em 10/09)*
   A versão original dizia "servidor não muda". A reversão de template precisa da fonte ativa da
   obra, e isso é função nova de serviço. Cabe sem rota nova: `eslint.config.mjs:84-95` libera a
   tela a chamar serviço direto ("A tela chama serviço direto"). O que continua barrado é rota,
   DTO e status mudarem — se o desenho pedir isso, o desenho está errado.
4. **iPhone fica no campo de colar**, e isso é dito na tela, não escondido.
5. **A reversão de template nasce com teste antes** — é `domain/`, TDD-first vale. Um dos testes
   é justamente o que **não** pode acontecer: ID de site opaco virando capítulo.
6. **A tela é `/leitura`**, não `/registrar`: diz o que é, casa com o nome da rota da API
   (`POST /api/v1/leitura`) e não lê parecido com `/cadastrar`. Não colide com a API — a tela é
   `/[locale]/leitura`, a API é `/api/v1/leitura`, e o matcher do proxy já exclui `api`.
7. **Adivinhar capítulo por URL sem template está fora.** *(10/09)* Nem heurística de segmento,
   nem lista de hosts. Progresso errado para cima é o dano que a #173 tratou como inaceitável.
8. **O `409` (`nao_avanca`) é resposta normal**, não erro. *(10/09)* A tela diz onde a estante
   está, sem pintar de vermelho e sem oferecer "tentar de novo".
9. **O retorno do login com o payload preservado está no escopo.** *(10/09)* Interface, não
   autenticação.

## Pendências

1. **Registrar e fechar sozinho?** Quando obra e capítulo vierem os dois resolvidos, dava para
   registrar sem tela de confirmação — 3 ações em vez de 5. Recomendação: **não no primeiro
   corte.** A #173 decidiu que registro sem conferência só existe com desfazer; o reset da
   estante existe e torna defensável, mas é inversão de decisão recente e o ganho é de 2 toques.
   Deixar como evolução, medida com uso real.
2. **Onde guarda o par?** `chrome.storage.local` não existe aqui. `localStorage` é síncrono e
   simples; IndexedDB aguenta mais. Recomendação: `localStorage`, o volume é minúsculo — **com o
   par separado por conta e validado contra a estante atual**, como `extension/comum.js` já faz
   com `parDoDono`. Navegador com duas contas não pode herdar par da outra.
3. **PWA e extensão dividem o mesmo par?** Hoje não dá — o par mora no navegador, não na conta.
   Compartilhar exigiria o par no servidor, o que estoura o "servidor não muda". Recomendação:
   **não** neste corte; anotar como candidato a issue própria.
4. **Critério de instalabilidade do Chrome.** *(corrigida em 10/09)* A versão anterior mandava
   conferir no **Lighthouse** — errado: as auditorias de PWA foram descontinuadas do Lighthouse.
   O critério de aceite é empírico, no aparelho: DevTools (Application → Manifest) mais a prova
   real de que **instala** e de que **aparece na folha de compartilhar**. Nada de afirmar de cor.
5. **Placeholder do template: `{chapter}` ou `{n}`?** Os testes usam os dois — `{chapter}` em
   `tests/repositories/progresso.privacy.test.ts:34`, `{n}` em `perfil.test.ts:58`. Antes de
   escrever a reversão, descobrir qual é o real (e se são os dois, tratar os dois).
6. **O Mihon compartilha a URL do capítulo ou da obra?** A promessa de registro depende disso, e
   **não foi verificada**. Se compartilha a obra, não há capítulo nenhum no payload e o cenário
   do app nativo cai para "digita sempre". Medir no aparelho antes de fechar a promessa.

## Pipeline

**Reordenado em 10/09.** A ordem anterior deixava ícones e textos antes de saber o que o Android
manda — e o formato do compartilhamento é a maior incerteza do desenho. Descobrir isso primeiro
não é atraso: é o que faz os testes nascerem com exemplo **real** em vez de inventado, que foi
exatamente o erro da primeira versão deste documento.

**Etapa 0 — coleta no aparelho (antes de qualquer regra de extração)**
`manifest.ts` + `sw.js` + ícones mínimos → tela `/leitura` provisória que só **mostra os três
campos crus** recebidos → instalar no Android → compartilhar do Chrome, do Mihon e de um site
com URL opaca → anotar o que veio em cada um.

**Etapa 1 — domínio, com os exemplos colhidos**
teste da reversão de template (incluindo o caso que **não** pode passar: ID virando capítulo) →
`domain/template-de-capitulo.ts` → teste do normalizador dos três campos → normalizador.

**Etapa 2 — serviço e tela**
leitura da fonte ativa na camada de serviço → tela `/leitura` de verdade → tratamento do `409` →
retorno do login com o payload preservado → textos nos 5 idiomas → ícones finais.

**Etapa 3 — prova final no aparelho**
instalar; compartilhar do Chrome; compartilhar do Mihon; URL opaca sem título; colar no iPhone;
**sessão expirada** (login e volta com o compartilhamento); **capítulo já marcado** (`409` sem
cara de erro). DevTools → Application → Manifest para a instalabilidade, não Lighthouse.

Sem teste automatizado para a folha de compartilhar (é o sistema operacional). O que dá para
testar é o domínio e o normalizador — e é onde a regra mora.

## Análise do Codex — 10/09/2026

**Autoria: Codex.** Esta é minha análise do desenho, solicitada pelo usuário, com base na
leitura deste documento, do código atual e da documentação técnica citada abaixo. As
recomendações desta seção **não são decisões já aprovadas** e não substituem automaticamente
o escopo original. Não houve implementação nem teste em aparelho nesta revisão.

**Minha avaliação:** seguiria com a feature. Ela oferece um caminho útil de registro no
celular, reaproveita a API e pode guardar a URL para o "Continuar". Concordo com a confirmação
manual no primeiro corte e com o escopo pequeno, mas ajustaria as seguintes premissas antes
da implementação.

### 1. Número na URL pode ser ID interno

O próprio `src/server/domain/titulo-de-capitulo.ts:6` documenta que a URL do MangaFire
`/chapter/4745884` contém um ID interno, não o número do capítulo. O teste registrado em
`feature-extensao-navegador/CLAUDE.md` associa essa URL ao capítulo 2.

**Minha recomendação:** título como primeira opção; extração pela URL somente para formatos
comprovados, considerando o host quando necessário. `/chapter/<número>` sozinho não é
evidência suficiente. Incluir testes que impeçam confundir IDs com capítulos, inclusive IDs
que caibam na faixa numérica aceita pelo domínio. Formato desconhecido deve devolver `null`.

### 2. A promessa de não digitar depende do payload real

Colar apenas uma URL opaca do MangaDex no iPhone não fornece obra nem capítulo para os
extratores propostos. Nesse caso, o fluxo também exige seleção da obra e digitação do capítulo.

A tabela de payload não deve garantir `url` separado no Chrome Android. A documentação do
Chrome alerta que URLs podem chegar em `text` ou até em `title`, sem garantia de preenchimento
do campo esperado. Fonte: [Chrome — Receiving shared data with the Web Share Target API](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target).

**Minha recomendação:** tratar "não digitar" como benefício condicionado aos dados recebidos;
o normalizador deve considerar os três campos. No Mihon, confirmar no aparelho se a ação usada
compartilha a URL do capítulo ou da obra antes de fechar a promessa de registro e de retorno
pelo "Continuar". Isso é uma validação pendente, não um comportamento comprovado nesta análise.

### 3. Sessão expirada precisa preservar o compartilhamento

Reaproveitar o cookie está coerente com a API existente. Porém,
`src/app/(ui)/[locale]/entrar/formulario.tsx:73` sempre navega para `/` após o login.
O fluxo atual não oferece retorno para `/leitura` com os dados compartilhados.

**Minha recomendação:** incluir no escopo da interface a preservação do payload durante o
login e a retomada da confirmação. A API de autenticação pode continuar intacta, mas
"auth: zero mudança" não cobre esse trabalho na interface.

### 4. O "Continuar" só muda quando o registro avança o progresso

`src/server/services/leitura-externa.service.ts:126` devolve `nao_avanca` sem gravar nada
quando o capítulo não supera o progresso atual; a rota traduz isso em `409`.

Exemplo: a pessoa marcou 57 manualmente e depois compartilhou a URL do 57. A API recusa o
registro e o "Continuar" permanece como estava. Compartilhar o 58 pode avançar e guardar a URL.

**Minha recomendação:** manter o contrato existente neste corte e explicitar essa limitação
na promessa da feature e no tratamento do `409`. O desenho não deve prometer corrigir a URL
de um capítulo já marcado sem que o serviço atual permita isso.

### 5. Pareamento local deve respeitar a conta

**Minha recomendação:** `localStorage` é suficiente para o volume previsto, com pareamento
separado por usuário e validado contra a estante atual. A extensão já verifica o dono em
`extension/comum.js` (`parDoDono`); a PWA deve preservar esse cuidado ao trocar de conta.
Concordo em deixar a sincronização dos pares entre aparelhos fora deste corte.

### 6. Duas correções na justificativa técnica

- **POST não exige service worker.** Pode ser tratado no servidor; a codificação também não
  é necessariamente `multipart/form-data`. GET continua adequado para abrir a confirmação,
  seguida do POST explícito à API existente. Minha recomendação é manter GET e corrigir a
  justificativa. Fonte: [MDN — share_target](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target).
- **Lighthouse não deve ser o critério de aceite da PWA.** As auditorias de PWA foram
  descontinuadas. Minha recomendação é inspecionar no DevTools e comprovar instalação e
  presença na folha de compartilhar no aparelho. Fonte: [Chrome — Site works cross-browser](https://developer.chrome.com/docs/lighthouse/pwa/pwa-cross-browser).

### 7. Minha proposta de ajuste no pipeline

Antecipar uma prova mínima no Android: manifest, tela que permita conferir os campos
recebidos e os requisitos necessários para instalação. Observar o compartilhamento real do
Chrome e do Mihon antes de consolidar as regras de extração e a experiência final.

Depois dessa coleta, escrever primeiro os testes do extrator e do normalizador com exemplos
reais, preservando o TDD do domínio, e seguir com a implementação prevista. A prova final no
aparelho continua necessária; acrescentar a ela sessão expirada e capítulo já marcado (`409`).

**Motivo:** o formato do compartilhamento é uma das principais incertezas do desenho. Ele deve
orientar a implementação, em vez de ser descoberto apenas depois dos textos, ícones e tela final.

## Resolução da revisão — 10/09/2026

Cada achado do Codex foi conferido no código antes de aceitar, e o documento acima já está
corrigido. O que ficou:

| # do Codex | Verificado em | Veredito |
|---|---|---|
| 1. Número na URL pode ser ID | `titulo-de-capitulo.ts:6-8` | **Procede.** Erro meu — os exemplos de `capituloDaUrl` eram inventados |
| 2. "Não digitar" é condicional | — | **Procede.** Tabela do fluxo refeita por situação, não por aparelho |
| 3. Login perde o compartilhamento | `entrar/formulario.tsx:73` | **Procede.** Furo de escopo; entrou no escopo e virou decisão 9 |
| 4. `409` limita o ganho do "Continuar" | `leitura-externa.service.ts:126`, `route.ts:109` | **Procede.** A promessa virou "daqui pra frente", não retroativa |
| 5. Par por conta | `extension/comum.js` (`parDoDono`) | **Procede.** Entrou na pendência 2 |
| 6a. POST não exige service worker | — | **Procede.** Justificativa reescrita com o motivo real |
| 6b. Lighthouse não serve | — | **Procede.** Pendência 4 corrigida para DevTools + prova no aparelho |
| 7. Coletar payload real antes | — | **Procede.** Pipeline reordenado, etapa 0 |

**Onde a solução foi diferente da recomendada.** No achado 1, o Codex propôs extrair da URL "só
para formatos comprovados, considerando o host". Isso é **lista de hosts**: cresce sem fim e é o
hardcode por site que `titulo-de-capitulo.ts` evitou de propósito.

A saída adotada usa o que já está no banco: **reverter o `urlTemplate`** que a própria pessoa
confirmou ao configurar a fonte. Dá certeza em vez de formato "comprovado", não cresce com o
número de sites, e devolve `null` sozinha quando não casa. O custo é relaxar a decisão 3 (função
nova de leitura na camada de serviço) — registrado lá, não contrabandeado.

**O que esta revisão NÃO fez:** nenhuma implementação, nenhum teste, nenhuma prova em aparelho.
Tudo que depende de medir o compartilhamento real segue como pendência.

## Referências

- `feature-extensao-navegador/CLAUDE.md` — decisões 7, 8 e 10
- `feature-extensao-auto-registro/CLAUDE.md` — #173, o que morre no celular
- #170 (o "Continuar" lê a última abertura), #172 (`nao_avanca` e o reset)
- `extension/comum.js` — `capituloDoTitulo`, `chaveDaObra`, `paresSalvos`
- `src/app/api/v1/leitura/route.ts` — a rota que não muda
- `src/app/(ui)/[locale]/estante/editar-progresso.tsx` — o `PATCH` sem URL
- `src/proxy.ts` — o matcher que já deixa passar
- MDN Web Share Target API
