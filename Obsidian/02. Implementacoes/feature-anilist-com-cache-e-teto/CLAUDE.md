# AniList com cache e teto — a página anônima que derruba o site inteiro

Issue #134, achado 4 da auditoria de 06/09/2026, severidade média. Desenho aberto em 09/09/2026. **Aguardando aprovação.**

## Objetivo

Hoje `GET /` já basta para gastar a cota pública do AniList: a raiz é `force-dynamic` e chama `buscarNoCatalogo(interpretarFiltros({}))` em todo render, o que vira um `POST` real para `graphql.anilist.co` com `cache: "no-store"`, saindo do IP único do deploy. Não autenticado, custo zero para quem faz.

Quando a cota estoura, o estrago é para **todo mundo**: `/` e `/catalogo` renderizam `indisponivel`, `/autor/<id>` idem, `/obra/<id>` sem cache fresco idem, e `POST /api/v1/estante` devolve 503 para qualquer obra não cacheada — ninguém adiciona nada à estante. O estado persiste enquanto o gotejamento continuar.

Objetivo: **uma máquina anônima deixar de conseguir isso**, sem tirar nada de quem navega de verdade.

Vale registrar que em 09/09/2026 o AniList está fora por conta própria (`403 "The AniList API has been temporarily disabled due to severe stability issues."`), então a tela de indisponível já é o estado corrente. Isso não muda o desenho, mas atrapalha a prova de ponta a ponta — ver **Pendências**.

## Escopo

Quatro frentes, em ordem de valor.

### 1. Memo na vitrine

A query dos populares é **idêntica para todo visitante**, e é o que `/` e `/catalogo` sem filtro batem. Envolver `buscarPopulares` com `lembrarPorTempo` (`domain/memoria-curta.ts`) numa janela curta.

Isso já existe no projeto e é usado **uma única vez**, na sonda do health (`sistema.service.ts`). A promessa em voo é compartilhada, então render concorrente não duplica a ida.

Onde: `catalogo.service.ts`, no módulo, não dentro da função — o memo tem que sobreviver entre requisições.

### 2. Memo por id em similares e autor

`autor.service.ts` documenta no cabeçalho não ter cache nenhum. Mesma ideia, mas a chave é o id, então `lembrarPorTempo` (que guarda um valor só) não serve direto: precisa de um mapa de id para função lembrada, com teto de tamanho para o mapa não virar vazamento de memória — chave escolhida pelo visitante é chave sem limite.

Decidir no desenho: `Map` com corte por tamanho, ou aceitar o vazamento por ser id numérico do AniList e processo serverless de vida curta. **Recomendação:** `Map` com teto e descarte do mais antigo, porque o id vem da URL.

### 3. Teto por IP na busca do catálogo

`buscarFiltrado` é o caso em que memo **não resolve**: `?q=<aleatório>` é chave escolhida por quem ataca, e cada valor novo é uma ida nova. Aqui a defesa é orçamento por IP, com `verificarERegistrar` num escopo novo, na forma dos limitadores que já existem.

Duas complicações reais:

- **O IP não chega igual.** `ipDoPedido` (`src/app/api/v1/_shared/ip.ts`) recebe um `Request`, e página server component não tem um: tem `headers()` do `next/headers`. A leitura do cabeçalho é da camada de apresentação, e o serviço não pode tocar em `headers()` — regra absoluta do projeto. Então a página resolve o IP e passa para baixo, como já faz com a sessão.
- **A tabela de tentativas é do banco.** Cada busca anônima passa a gravar linha em `AuthAttempt`, que é justamente o item 1 da #148 (a tabela cresce sem limite e ninguém recolhe). Trocar uma pressão por outra precisa ser decisão consciente.

**Recomendação:** teto folgado por IP, e a issue do recolhimento (#148, item 1) vira pré-requisito ou entra junto.

### 4. Corte do termo

`.slice(0, 100)` no termo dentro de `interpretarFiltros`. Barato, puro domínio, teste trivial. Entra em qualquer cenário.

## Regras específicas

- `interpretarFiltros` acabou de mudar na #145 (parâmetro repetido). O corte entra na mesma função, sem desfazer aquilo.
- Nada de erro de terceiro na tela: o `catch` de `buscarNoCatalogo` já devolve `indisponivel` sem texto do AniList. Manter.
- Serviço não toca em `Request`, `cookies()` nem `headers()`.
- Toda tela ou texto novo nasce nos cinco idiomas. Se o teto por IP virar mensagem visível, a chave entra em `de`, `en`, `es`, `fr` e `pt-BR` no mesmo commit.
- TDD vale para domínio e serviço: o teste do memo e o do corte vêm antes.

## Decisões tomadas

**A gravação anônima de `Media` fica como está** (decisão do usuário, 09/09/2026). A issue propunha fechar `deps.salvarMedia` para visitante anônimo em `obra.service.ts`, para caminhar por ids não inserir linhas sem limite. Mas é exatamente esse cache que a #165 quer servir quando o AniList está fora — que é o estado de hoje. Fechar a gravação esvaziaria a fonte da #165. O abuso é cortado na origem pelo memo e pelo teto por IP.

## Pendências

- **Aprovação deste desenho** antes de qualquer código.
- Escolher entre `Map` com teto e memo simples no item 2.
- Decidir se o item 1 da #148 (recolher `AuthAttempt`) entra junto com o item 3 ou vira pré-requisito.
- **Prova de ponta a ponta bloqueada enquanto o AniList estiver fora.** Com a API de terceiro respondendo 403 a tudo, não dá para observar a diferença entre uma ida e uma ida cacheada na resposta real. O que dá para provar sem rede: o memo, por teste de serviço com relógio injetado e contagem de chamadas na dependência falsa, que é a forma que `lembrarPorTempo` já tem em teste. O teto por IP se prova com `curl` normalmente, porque não depende do AniList responder.

## Referências

- Issue #134 e o relatório `Obsidian/04. BUGS/Criar Issue Antes de Fazer/auditoria-seguranca-2026-09-06.md`
- `src/server/domain/memoria-curta.ts` e o uso em `src/server/services/sistema.service.ts`
- `src/app/api/v1/_shared/ip.ts`, `src/server/services/limite.service.ts`
- Issue #165 (cache de `Media` no fallback) e #148, item 1 (recolhimento de `AuthAttempt`)
