# Apresentação técnica

A apresentação aprovada com o professor. **É a fonte de verdade do desenho do projeto** — modelo de
dados, camadas, fluxo de requisição e cronograma de fases saem daqui.

## Onde está

| | |
|---|---|
| Ao vivo | https://claude.ai/code/artifact/10425b3e-b3fd-4013-a3a5-fa18e220e58a |
| Cópia no vault | [`apresentacao-tecnica.html`](apresentacao-tecnica.html) |

A cópia local é para consulta offline e para o histórico ficar no Git. **A versão que vale é a de
cima** — se as duas divergirem, a do link é a publicada.

Para reler um painel sem abrir o navegador, o HTML é grep-ável: `grep -n "num\">06" apresentacao-tecnica.html`.

## Os painéis

| # | Assunto | Serve para |
|---|---|---|
| 01 | A ideia | por que o dado de leitura é privado por projeto, não por configuração |
| 02 | O mecanismo | derivação do template de URL, e o caso de dois candidatos |
| 03 | Requisitos da atividade | o que foi pedido e onde se verifica |
| 04 | Arquitetura em camadas | as regras e quem cobra cada uma |
| 05 | Fluxo de uma requisição | onde cada camada entra, do clique ao SQL |
| 06 | Modelo de dados | as entidades, os índices e o que cada relacionamento demonstra |
| 07 | Tecnologias | a stack e o motivo de cada peça |
| 08 | Deploy | do push ao ar |
| 09 | Entrega | as seis fases e o checklist do Classroom |

## Histórico de atualizações

**27/08/2026 — links no ar.** Os quatro chips "a publicar" viraram links: repositório e produção no
cabeçalho, e os dois itens do checklist do painel 09. Fase 1 fechada.

**27/08/2026 — correções técnicas.** Dois pontos tinham envelhecido em relação ao código:

- Painéis 03 e 07 diziam **Next.js 15**; o projeto está no **16.3.3**.
- Painel 04 mostrava `boundaries/element-types` com a sintaxe da v5 do plugin. A v7 usa
  `boundaries/dependencies` com `policies`, e a regra de `ui` passou a permitir `service` — server
  component que fizesse `fetch` no próprio `/api/v1` custaria uma segunda invocação de função por
  render na Vercel.

## Divergência conhecida, não corrigida

O **painel 05** mostra a infra do AniList gravando cache de 24 h em `Media`. Isso **ainda não existe**
no código: `/catalogo` busca sem gravar, porque a tela precisa funcionar sem banco.

Não é erro da apresentação — é ordem de implementação. O cache entra na issue #10, junto com adicionar
obra à estante, que já precisa da linha em `Media` para o `ShelfEntry.mediaId`. O motivo do adiamento
está em [[../../02. Implementacoes/slice-vertical/CLAUDE|slice-vertical]].

## Como atualizar

O artifact é publicado a partir do arquivo, não editado no navegador. Ao mexer:

1. Editar o HTML — sem `<!doctype>`, `<html>`, `<head>` ou `<body>`: o publish embrulha sozinho.
2. Publicar passando a **URL acima**, senão nasce um artifact novo em vez de atualizar este.
3. Copiar o resultado de volta para cá, para as duas versões não divergirem.
