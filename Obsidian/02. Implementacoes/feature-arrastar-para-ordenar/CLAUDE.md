# Arrastar livros para ordenar a lista — feature/arrastar-para-ordenar

## Objetivo

Na prateleira da própria lista, arrastar um livro para a esquerda ou para a
direita muda a posição dele. Ordem importa numa lista ("top 10 seinens"), e
antes reordenar exigia abrir o painel de cada obra e clicar setas.

Junto veio o Salvar explícito: ordem e remoção passam a ser rascunho.

## Escopo

- Arrastar um livro na prateleira reordena a lista.
- Ordem e remoção ficam em rascunho até o Salvar. Adicionar pela busca continua
  entrando na hora.
- Só na lista de quem é dono. As outras dez telas que usam `ColecaoVisual`
  seguem sem arraste.
- As setas do painel continuam: arrastar não tem equivalente de teclado.

## Regras específicas

- **Mouse**: arrastar direto já move. No modo de andar simples o trilho tem
  `overflow-x: hidden`, então não há rolagem para o gesto competir.
- **Toque e tela estreita**: abaixo de 720px o trilho volta a rolar
  (`overflow-x: auto`), e arrastar já significa rolar. Ali vale segurar 400ms
  para entrar no modo de reordenar; arrastar direto continua rolando. Enquanto
  reordena, `touchmove` é barrado em listener NÃO passivo — mudar `touch-action`
  no meio do gesto não tem efeito, o valor vale desde o `touchstart`.
- **Durante o arraste todos os livros fecham.** Larguras viram lombadas iguais
  e estáveis; com um livro aberto sob o ponteiro o alvo do solto vira loteria.
- **A vaga abre ao vivo**: a ordem é reescrita a cada vizinho cruzado, então a
  prateleira que se vê antes de soltar já é a final.
- Andar é preenchido por largura, então mover um livro pode empurrar outro para
  o andar de baixo. É o certo: a lista é uma ordem só, o andar é só o desenho.
- O destino sai do `.livro` sob o ponteiro (`elementFromPoint`), não do índice
  dentro do andar, então arrastar de um andar para outro sai pelo mesmo caminho.
- **Salvar aplica os `DELETE` e só então o `PUT` da ordem**: a rota exige
  permutação exata do que restou.
- `DELETE` 404 no Salvar é obra que já não estava lá — que é o que o rascunho
  queria. Não vira erro.
- Lista nova vinda do servidor **preserva** o rascunho: adicionar pela busca dá
  refresh, e descartar ali apagaria o trabalho em curso. Obra que sumiu no
  servidor sai do rascunho; obra que ele passou a ter entra no fim.
- Fechar a aba com rascunho pendente pede confirmação do navegador. O texto é
  dele — desde 2016 nenhum navegador deixa a página escolher a frase.

## Decisões tomadas

- Segurar para reordenar no toque, em vez de alça de arraste na lombada: a alça
  polui a lombada e dá alvo pequeno.
- Vaga ao vivo em vez de linha de destino: com os livros fechados, deslocar quem
  está entre origem e destino é barato.
- O gesto vive na `ColecaoVisual`, que conhece a coleção inteira e o índice
  global de cada obra; a `Prateleira` só desenha o andar.
- Rascunho cobre ordem e remoção, não adição: quem buscou uma obra e clicou no
  "+" escolheu aquela obra de propósito.
- O botão de remover em dois passos saiu: Salvar é a confirmação, e desistir é
  não salvar. `RemoverDaLista` e a chave `removerConfirmacao` saíram junto.
- O ref da caixa mora na `ColecaoVisual` e é passado ao hook, não devolvido por
  ele: `react-hooks/refs` acusa leitura de ref durante o render quando o ref sai
  dentro do objeto de retorno.

## Pendências

- O cabeçalho da lista mostra a contagem SALVA ("3 obras") enquanto o corpo
  mostra o rascunho ("2 obras"). É honesto, mas as duas contagens aparecem na
  mesma tela e podem confundir. Decidir com o usuário se o cabeçalho passa a
  refletir o rascunho.
- O arraste no toque não foi provado em aparelho real, só a lógica.

## Validação em 10/09/2026

- 717 testes, lint e `tsc` limpos. Cada commit compila sozinho (provado com
  `git stash` na árvore do commit do gesto).
- Chromium local, lista própria: arrastar o terceiro livro para a primeira
  posição reordenou na tela; o painel apareceu com "1 mudança por salvar";
  Salvar gravou (`PUT ... /ordem 200`) e a ordem sobreviveu ao recarregar.
- Remover pelo painel tirou a obra da prateleira sem tocar o banco (nenhum
  `DELETE` no log) e o painel lateral fechou sozinho; Descartar devolveu a obra
  e zerou a contagem.
- Laboratório: ordem intacta e dica antiga, confirmando que o arraste só existe
  onde `aoReordenar` é passado.

## Referências

- Issue: #242
- `feature-lists/CLAUDE.md` — as setas e a rota de ordem (#51).
- `feature-adicionar-na-lista/CLAUDE.md` — a busca que adiciona (#237) e as
  prateleiras (#241).
