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
- **Durante o arraste a prateleira não muda de largura.** A capa que fica
  aberta é congelada na pegada, pelo identificador e não por posição, e nunca é
  o livro da mão: quem agarra a própria capa aberta a vê passar para o vizinho.
  Sempre existe exatamente um livro aberto, então a largura total é invariante.
  Antes a capa fechava junto e o andar encolhia uns 120px na pegada, fugindo do
  cursor — 156px de zona morta medidos antes da primeira troca.
- **Hover e foco não abrem livro durante o arraste.** Livro que abre sob o
  ponteiro muda de largura no meio do gesto e o alvo do solto vira loteria.
- **Duas guardas contra o piscar, e nenhuma basta sozinha.** O livro só cede a
  vez depois que o ponteiro passa do MEIO dele, no sentido em que a mão anda, e
  cede uma vez só por travessia, ficando travado até o ponteiro sair de cima.
  A capa aberta tem 168px contra 46 da lombada: trocar de lugar com ela a
  desloca uns 50px e ela cruza o cursor de volta, o que dava 26 trocas seguidas
  de quatro em quatro pixels.
- **Vão entre lombadas e a vaga do próprio livro na mão ficam quietos.** Tratar
  o vão como ponta do andar fazia a ordem trocar e destrocar a cada 4px.
- **O livro agarrado fecha como os outros e segue o ponteiro.** Quem resolve o
  "nada se mexe" é ele acompanhar o cursor, não o tamanho: arrastar uma capa
  aberta pela prateleira lê estranho. Solto na primeira posição ele reabre
  sozinho, porque volta a ser a vitrine do andar.
- **A pegada é guardada como fração da largura, não em pixel.** O livro fecha ao
  ser agarrado, e 138px medidos numa capa de 168px cairiam fora de uma lombada
  de 46px.
- **Passar das pontas do andar vale como começo ou fim, mas só quando o
  movimento concorda com a ponta.** Sem checar o sentido, arrastar para a
  esquerda a partir de fora da prateleira era lido como "passou do fim" e o
  livro ia para o fim da fila — o contrário do gesto.
- **O livro agarrado sai do teste de acerto** (`pointer-events: none`): o cursor
  está grudado nele, então ele seria sempre o resultado e nenhum destino
  apareceria.
- **A medida do deslocamento roda num efeito de layout**, disparado por
  [arrastado, itens]. Agarrar fecha o livro e cruzar um vizinho muda a posição
  de fila: nas duas o DOM muda depois da medida feita no movimento, e o livro
  saía do cursor por um quadro (medido: 137px ao agarrar uma capa aberta, 55px
  a cada troca). Efeito de layout roda depois do commit e antes de pintar, e
  ainda funciona em aba oculta, onde requestAnimationFrame nem dispara.
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

- A supressão de clique escrita no arraste é código morto: o estado já foi
  limpo quando o clique chega. Hoje o clique depois do arraste é engolido pela
  checagem de distância do #241 — funciona, mas por acidente. Limpar.
- O cabeçalho da lista mostra a contagem SALVA ("3 obras") enquanto o corpo
  mostra o rascunho ("2 obras"). É honesto, mas as duas contagens aparecem na
  mesma tela e podem confundir. Decidir com o usuário se o cabeçalho passa a
  refletir o rascunho.
- O arraste no toque não foi provado em aparelho real, só a lógica.

## Validação em 10/09/2026

- Soma das larguras dos livros constante em 275px do início ao fim do arraste,
  medida a cada quatro pixels: a prateleira não se mexe mais sob o ponteiro.
- Duas trocas por arraste de 240px, nos dois sentidos, sem nenhuma corrida de
  4px. A primeira troca caiu de 156px para 52px de movimento.

- 717 testes, lint e `tsc` limpos. Cada commit compila sozinho (provado com
  `git stash` na árvore do commit do gesto).
- O livro arrastado foi medido a cada movimento: pego numa capa aberta de 168px
  na fração 0,82, vira lombada de 46px e o cursor fica cravado em 0,82 dela em
  todos os passos. Arrastado para além da última lombada, foi para o fim da
  fila; ao soltar, o que ficou em primeiro reabriu em 168px.
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
