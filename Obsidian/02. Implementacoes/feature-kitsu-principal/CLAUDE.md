# Ficha editorial do Kitsu

Branch: `feature/kitsu-principal`. Alteração autorizada pelo usuário em 11/09/2026.

## Escopo

- Importar banner, gêneros, autoria, status, volumes, datas, nomes alternativos,
  categorias e relações ao abrir uma obra. Importação sob demanda, sem espelhamento.
- Mostrar dados editoriais separados da leitura pessoal. Autores com somente ID
  Kitsu não apontam para a rota de autor do AniList.
- Catálogo com filtros de publicação, seis temas traduzidos e leituras curtas
  (concluídas com 1 a 30 capítulos). Preservar filtros na paginação e no fallback.
- Todas as novas mensagens em pt-BR, en, es, fr e de. Títulos e sinopses continuam
  sendo dados da fonte, sem tradução automática.

## Decisões

- Coluna aditiva `Media.details` em JSON versionado. Cache anterior é enriquecido
  na próxima abertura mesmo dentro do TTL. Respostas parciais preservam os campos
  e relações que já conhecemos; não inferir contagens, datas ou autoria.
- Resolver recursos incluídos pelo par tipo/id e pelo vínculo da obra, evitando
  associar mapeamentos ou categorias de outra obra ao registro principal.
- Relações limitadas a 12 mangás/novels; animes ficam fora das rotas de leitura.
- Importar categorias recebidas, mas expor como filtros apenas o vocabulário
  validado e traduzido. Outros temas podem entrar numa ampliação posterior.
- Status do Kitsu não significa calendário confiável de próximos capítulos.

## Validação

Testes de domínio, serviço, i18n, persistência no banco exclusivo de teste,
TypeScript, lint e build isolado da pasta usada pelo servidor de desenvolvimento.
Migration de produção não é aplicada nesta tarefa.

Resultados: suíte geral com 766 testes aprovada, mais dois testes da integração
Kitsu; 112 testes de banco aprovados; build de produção aprovado. As cinco páginas
de detalhes e o catálogo responderam HTTP 200 na prévia isolada. Consulta real de
Berserk validou tanto o ID Kitsu quanto o mapeamento AniList.

Achados da API: autoria atual em `staff.person`, mantendo também o caminho legado
`mangaStaff.person`; `/mappings` rejeita includes aninhados no item polimórfico,
então a ficha é buscada numa segunda chamada pelo ID Kitsu encontrado.

Ambiente local: `migrate dev` apontou divergências anteriores nas migrations
`20260901171659_review_social` e `20260901173013_lists`. Sem reset ou alteração
dessas migrations; a coluna nova foi aplicada pelo script de migrations do projeto
com o `.env` local (localhost/mymangatracker), após validação no banco de teste.

## Perfis de autores e revisão das telas

- Autorizado pelo usuário completar autores do Kitsu e demais lacunas nas telas.
- `/autor/kitsu/:id` usa `people/:id?include=staff.media`: nome, imagem,
  biografia e mangás/novels vinculados por autoria. Exclui animes e assistentes;
  inclui criadores originais. Consulta sob demanda, sem nova tabela ou migration.
- URLs antigas `/autor/:id` continuam AniList. Não existe mapeamento verificado
  entre pessoas: falha de uma fonte não consulta o mesmo número na outra.
- Cache separado por fonte, cinco minutos e até 200 IDs. A ficha da obra prefere
  o link de autor Kitsu quando esse identificador existe.
- Busca para adicionar obras às listas agora deduplica e monta links pela
  identidade com fonte, preservando obras que não possuem ID AniList.
- Health da home reconhece Kitsu. Similares continuam AniList; relações Kitsu
  permanecem na seção própria. Mensagens adaptadas nos cinco idiomas.
- Validação: 779 testes aprovados, TypeScript e build aprovados; lint sem erros
  (dois avisos anteriores de imports não usados em `lista.service.ts`). Perfil
  real de Miura HTTP 200 nas cinco línguas, nove obras, links válidos e layout
  sem overflow no celular. URLs inválidas retornam 404. Comparação posterior
  confirmou que as miniaturas de Miura, Urasawa e Inoue vêm brancas/estouradas,
  mas os originais estão normais. A importação agora prefere `image.original`.

## Limite durante testes locais

O usuário encontrou o catálogo bloqueado no localhost após testes contínuos.
O aviso vinha do limitador interno: 374 tentativas registradas na última hora,
incluindo bloqueios, contra o teto de 120. Em `NODE_ENV=development`, a janela
agora é de cinco minutos, ainda com teto de 120 por IP. Produção, preview e
ambientes não identificados como desenvolvimento mantêm 120 por hora.
Nenhum contador foi apagado e nenhuma regra de login ou escrita foi alterada.
