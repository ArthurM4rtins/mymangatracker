# Coleções em grade e prateleira — #182

## Objetivo

Aplicar a visualização de obras do catálogo às demais coleções do Kidoku,
com a prateleira em CSS inspirada em Shelf Stories e na estante de jcarbonell.

## Escopo implementado

- Alternância Grade/Prateleira no catálogo, estante, populares e continuar
  lendo da home, estante e avaliadas do perfil, listas próprias e públicas,
  obras do autor e obras similares. Grade continua sendo a visualização
  inicial; a escolha dura enquanto o componente está montado.
- `ColecaoVisual` aceita a disposição da grade de cada tela e usa uma única
  prateleira quando não há agrupamentos específicos.
- `CartaoObra` compartilha capa, fallback, título e espaços para metadados e
  ações. O painel exibe o título completo, inclusive para obras sem capa.
- Estante dividida por status, preservando filtros e a ordem da grade atual.
- Lombadas com título vertical, recorte da capa, paleta determinística por obra
  e alturas variadas. A primeira capa fica exposta; foco e hover revelam outras.
- Painel lateral reaproveita o card renderizado no servidor e suas ações.
- Rolagem por toque, arraste do mouse e botões; navegação entre obras com
  esquerda/direita/Home/End, abertura por Enter/Espaço, fechamento por Escape.
- Dialog nativo, ciclo de foco e retorno ao livro; confirmação de reset mantém
  Escape e ciclo de foco próprios. Movimento reduzido respeitado.
- Reordenar uma lista preserva o modo e o painel durante a atualização do
  servidor. Remover a obra selecionada fecha o painel e devolve o foco ao
  seletor de visualização. Resposta recusada restaura a ordem anterior.
- Cinco idiomas e os três temas existentes. Cabeçalho pode quebrar linhas em
  telas estreitas para evitar overflow da página inteira.
- `/pt-BR/laboratorio/prateleira`: demonstração com 15 metadados públicos fixos,
  disponível somente em desenvolvimento. Não depende de API ou banco para
  listar as obras; as imagens continuam hospedadas no CDN do AniList.

## Decisões e limites

Sem biblioteca 3D, dependência nova, migration ou mudança de regra de negócio.
As cores são uma paleta estável com a capa sobreposta, não extração de cor
dominante. Quando a imagem falha, permanecem a cor e o título da lombada.
Filtros e ordenação do catálogo continuam existentes; filtro de gênero e nova
ordenação na estante não fazem parte deste primeiro experimento.
Resenhas, atividades e cartões que representam listas continuam em seus
componentes próprios; as obras dentro das listas usam a coleção compartilhada.
O desenvolvimento ocorreu em `desenvNovoDesignCatalogo`. Após a validação visual,
o usuário autorizou a publicação: atualizar com `main`, abrir o PR e integrar
quando o job de lint, testes e build passar, preservando as correções da base.

## Validação em 09/09

- 523 testes existentes passaram; os 38 testes de mensagens passaram novamente
  após neutralizar o título do painel nos cinco idiomas.
- TypeScript e ESLint passaram.
- Chromium no laboratório real: 15 obras, abertura por Enter, Escape e retorno
  de foco em pt-BR/en/es/fr/de; sem erros de runtime.
- Componentes reais em montagem isolada com APIs de lista simuladas: grade e
  prateleira, fallback de capa, título longo, setas do teclado, progresso 57.5,
  filtro do perfil preservando o modo, nota 4.5, reordenação com refresh,
  rollback e remoção com retorno de foco. Nenhuma coleção real foi alterada.
- Viewport de 390px: três temas sem overflow persistente, painel e movimento
  reduzido. Capturas locais em `.next/issue-182/validation/`. Aparelho físico
  e operações com uma conta real continuam sem validação nesta etapa.
- Build de produção com webpack concluído em cópia isolada, sem `.env` ou
  conexão com banco. As tentativas anteriores sem conclusão ficam superadas.

## Integração com a base atual

- Atualização com `origin/main` preserva os limites de consulta e escrita,
  a data pública das resenhas, as guardas de sessão e a confirmação de remoção.
- Conflitos de tradução resolvidos mantendo o título neutro do painel e os
  novos textos da base. Finais de linha dos arquivos de tela normalizados em LF.
- 624 testes unitários e lint passaram após essa atualização.
- Publicação pelo PR com destino a `main`, condicionada ao job do CI que inclui
  lint, testes unitários, testes de repositório em Postgres e build sem banco.

## Ambiente atual

O workspace principal está em `desenvNovoDesignCatalogo`. Para avaliar,
iniciar `pnpm dev` e visitar as telas ou `/pt-BR/laboratorio/prateleira`.
O build foi executado em `.next/issue-182/build`, com os fontes copiados e
as dependências já instaladas no workspace, sem interferir no servidor da 3000.
Os arquivos em `.next/` são temporários e não entram no versionamento.

![Prévia em desktop](./previa.png)

## Referências

- https://github.com/ArthurM4rtins/mymangatracker/issues/182
- https://shelf-stories.linusekenstam.chatgpt.site/
- https://www.jcarbonell.com/bookshelf
