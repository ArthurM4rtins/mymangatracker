# Registro automático na extensão — sem clique, com o desfazer já existindo

Issue #173. Desenho aberto em 08/09/2026, depois de #171 e #172 fechadas. Aguardando aprovação.

## Objetivo

Com a obra pareada e o capítulo saindo do título sozinho, o clique em "Registrar leitura" virou repetição: a extensão já sabe obra e capítulo antes da pessoa tocar em nada. Objetivo: quando a pessoa está lendo um capítulo que **avança** o progresso de uma obra **pareada**, registrar sem clique.

## O que mudou desde que a ideia foi recusada

A decisão 10 do desenho da extensão dizia: *"sem auto-registro enquanto não houver como desfazer"*. As duas condições que faltavam existem agora:

- **O servidor só grava o que avança** (#172, parte 1): capítulo menor ou igual devolve `nao_avanca` sem tocar o banco. Registro automático de capítulo errado **para baixo** é impossível por construção.
- **O reset existe** (#172, parte 2): registro errado **para cima** se desfaz no card da estante, com confirmação numérica.

Sobra o risco residual: capítulo errado para cima que a pessoa não percebe. É o que as salvaguardas abaixo tratam.

## Duas decisões antigas que esta tarefa inverte

- **Decisão 8** — *"observar sempre, gravar só no clique"*. O `background.js` hoje nunca escreve no servidor; passa a escrever. Anotar lá.
- **Decisão 10** — a condição foi cumprida; já anotado no PR #183.

## Quando registra (todas as condições, nenhuma opcional)

1. **Ligado pela pessoa.** Chave "registrar automaticamente" no popup, **desligada por padrão**. Quem instalou a extensão para clicar continua clicando.
2. **Obra pareada.** Só `chaveDaObra` com par salvo (`chrome.storage`), e o `entradaId` do par tem que estar na estante da sessão atual — a mesma checagem que o popup já faz, e que o badge ainda não faz (#181). Nunca decidir a obra pelo nome (#171) no mesmo movimento em que grava: casamento de nome é palpite, e palpite não grava sozinho.
3. **Capítulo no título.** `capituloDoTitulo` diferente de `null`. Sem número, nada.
4. **Aba ativa, janela em foco.** `chrome.tabs.get(tabId).active` e a janela é `chrome.windows.getLastFocused()`. Aba em segundo plano e pré-carregamento não contam.
5. **Ficou na página.** Espera de **20 segundos** com a mesma aba, mesma URL e mesmo capítulo no título. SPA que troca o título antes de carregar o conteúdo (MangaDex) se estabiliza antes disso; quem passou batido não fica 20 segundos.
6. **Uma vez por (aba, obra, capítulo).** Memória em `chrome.storage.session` para não bater no servidor a cada mudança de título.

O servidor continua sendo quem decide se avança. O `background.js` não sabe o progresso e não precisa: manda, e `nao_avanca` é resposta normal, não erro.

## O que a pessoa vê

- **Badge** da aba vira `✓` verde quando registrou e **fica** até a aba trocar de página; `!` vermelho quando tentou e falhou (rede, servidor); `●` âmbar é pareada sem registro. `nao_avanca` não muda o badge.
- **Popup** não mostra aviso. Existiu na primeira versão ("cap. 68 registrado automaticamente" + "desfazer") e saiu a pedido do usuário em 08/09: o badge já diz que registrou, e o desfazer é o reset na estante, que o "abrir o site" do topo alcança.
- **Sem notificação do sistema.** Custaria a permissão `notifications` e o aviso na instalação; o badge basta.

## O que NÃO muda

- Permissões: `tabs`, `cookies`, `storage`, `host_permissions` já existem. Nenhuma nova.
- Auth: o `background.js` lê o cookie pelo mesmo `KIDOKU.sessao()` que o popup usa e manda `Authorization: Bearer`.
- Rota: o mesmo `POST /api/v1/leitura`. O servidor não distingue automático de clicado — nem precisa.

## Limitação aceita: o service worker morre

MV3 encerra o service worker ocioso. A espera de 20 segundos vive num `setTimeout` dentro dele: se o worker morrer no meio, o registro daquele capítulo não acontece. **É o lado seguro de falhar** — a pessoa clica, como hoje. `chrome.alarms` sobreviveria, mas exige permissão nova e o mínimo é 30 segundos; não vale o custo para um recurso que é conveniência.

## Escopo

Dentro: chave no popup (persistida em `chrome.storage.local`), a lógica no `background.js`, a memória por aba, o badge em três estados, textos nos cinco `_locales`. A URL da aba passou a ficar escondida por padrão no popup ("ver link"): o reset apaga o que subiu e o automático grava sem o popup abrir, então mostrar sempre virou ruído.

Fora: qualquer mudança no servidor; corrigir o #181 (fica como está, mas a condição 2 já não repete o erro dele no caminho novo).

## Pendências

1. **Chave global ou por obra?** Recomendação: **global**, desligada por padrão. Por obra é mais uma tela e mais um estado para explicar; se fizer falta, é evolução.
2. **20 segundos** é chute informado, não medida. Recomendação: constante nomeada, fácil de ajustar; revisar depois de uma semana de uso real.
3. **Registro automático em obra Planejada** promove para Lendo (decisão 7). Aceitável? Recomendação: sim — se está pareada e a pessoa está no capítulo, está lendo.

## Pipeline

textos (`_locales` ×5) → chave no popup → `background.js` (condições 2–6, registro, badge, memória) → aviso no popup → anotar a decisão 8 → teste manual: ligado/desligado, aba em segundo plano, capítulo menor (`nao_avanca` silencioso), capítulo maior (badge `✓` + aviso + estante avançou), reset desfazendo.

Sem teste automatizado possível no `background.js` (API do Chrome); o que dá para testar é o que já está testado no domínio (`capituloDoTitulo`) e no servidor (`nao_avanca`).

## Referências

- #173 (esta), #172 (as duas condições), #181 (a checagem que o badge não faz)
- `extension/background.js` — observa as abas, hoje só para o badge
- `extension/comum.js` — `chaveDaObra`, `capituloDoTitulo`, `sessao`, `paresSalvos`
- `feature-extensao-navegador/CLAUDE.md`, decisões 7, 8 e 10
