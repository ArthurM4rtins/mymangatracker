# Lições

Padrão que voltou a morder, e a regra que evita repetir. Ler no início de sessão antes de mexer
em área que já apareceu aqui.

---

## Rede que "não tem internet" mas tem — DNS só com AAAA

**27/08/2026.** `npm ping`, `pnpm dlx` e `Invoke-WebRequest` para `registry.npmjs.org` davam
ECONNRESET e timeout, enquanto o Chrome navegava normalmente e `https://github.com` respondia 200.

O que os dados mostraram:

| Checagem | Resultado |
|---|---|
| `Resolve-DnsName registry.npmjs.org` | só registros **AAAA** (IPv6) |
| `Test-NetConnection registry.npmjs.org -Port 443` | `True`, via IPv4 `104.16.7.34` |

Ou seja: o caminho IPv4 estava aberto, o DNS entregava IPv6, e o Node ia de IPv6 numa rede cujo
IPv6 não completa handshake.

**Regra:** quando só uma ferramenta Node perde a rede e o browser não perde, comparar
`Resolve-DnsName` com `Test-NetConnection` antes de suspeitar de proxy, antivírus ou registry
fora do ar. Se o DNS só devolve AAAA e o TCP em IPv4 passa, testar:

```bash
export NODE_OPTIONS="--dns-result-order=ipv4first"
```

**Resultado (27/08, rede de casa):** `npm ping` respondeu `PONG 321ms` sem nenhum ajuste.
O `NODE_OPTIONS=--dns-result-order=ipv4first` nao chegou a ser necessario, entao a hipotese
do IPv6 continua sem confirmacao direta - o que esta provado e que o problema era da rede da
escola, nao do projeto. Se reaparecer em outra rede, testar a variavel antes de investigar
proxy, antivirus ou registry fora do ar.

---

## Heredoc do Bash quebrando com conteúdo grande

**27/08/2026.** `cat > arquivo.html <<'EOF'` com ~330 linhas de HTML falhou com
`unexpected EOF while looking for matching '` mesmo com o delimitador entre aspas simples, que
deveria tornar o conteúdo literal. Refazer com a ferramenta Write funcionou de primeira.

**Regra:** arquivo grande, ou com muita aspa e caractere especial, vai pela ferramenta Write.
Heredoc fica para script curto.

---

## `create-next-app` nao aceita pasta com arquivo proprio

**27/08/2026.** O handoff dizia que `Obsidian/`, `tasks/`, `prisma/`, `tests/`, `.claude/` e
`.github/` nao conflitavam com o `create-next-app`. Conflitam. A whitelist dele so tolera
`.git`, `.gitignore`, `LICENSE`, `README.md`, `docs/` e alguns arquivos de CI; qualquer outra
entrada aborta com "The directory contains files that could conflict".

**Regra:** scaffold em diretorio temporario com `--skip-install`, copiar so os arquivos gerados
para dentro do repo e rodar `pnpm install` la. Nao copiar `node_modules` entre pastas — o pnpm
usa symlink para o store virtual e a copia quebra.

Cuidado extra: o template gera `CLAUDE.md`, `AGENTS.md` e `README.md` proprios. Se copiar tudo
sem filtrar, o `CLAUDE.md` do projeto e sobrescrito.

---

## `prisma init` instala skills e symlinks dentro do repo

**27/08/2026.** `prisma init` criou `.agents/skills/`, `.windsurf/skills/`, `skills-lock.json`
e nove symlinks em `.claude/skills/` apontando para `.agents/skills/`. Apagar `.agents/` deixou
os symlinks pendurados.

**Regra:** depois de `prisma init`, conferir `git status` antes de commitar. Symlink em repo Git
no Windows quebra o clone de quem nao tem developer mode ligado — doc de vendor nao entra no repo.

---

## Mexer no boundaries sem reprovar — `partialMatch` nao e `mode: "full"`

**27/08/2026.** As regras de camada foram provadas quebrando com `mode: "full"` nos elementos.
Depois, para calar um aviso de deprecacao, `mode: "full"` virou `partialMatch: false` — e a troca
foi commitada sem refazer a prova.

Nao sao equivalentes no casamento de padrao. Com `partialMatch: false`, `X/**/*` deixou de casar
quando `**` precisa cobrir zero segmentos:

| Arquivo | Padrao | `mode: "full"` | `partialMatch: false` |
|---|---|---|---|
| `src/app/(ui)/page.tsx` | `src/app/**/*` | casa | casa (`**` = `(ui)`) |
| `src/server/domain/rating.ts` | `src/server/domain/**/*` | casa | **nao casa** |

Resultado: todo arquivo direto em `src/server/{domain,services,repositories,infra}` virava
"unknown element" e passava por cima das regras de fronteira sem erro nenhum. O lint continuava
verde — a falha era silenciosa, que e o pior tipo.

**Regra:** a exigencia do `CLAUDE.md` de comprovar o boundaries quebrando vale para **qualquer**
alteracao na config, inclusive troca de sintaxe que "deveria ser equivalente". A prova nao e o
lint dar verde; e o import proibido dar vermelho. Cobrir os dois lados: um caminho permitido que
passa e um proibido que quebra, por regra.

Usar `X/**` nos padroes de elemento. `X/**/*` so funciona quando sempre existe um segmento
intermediario.

---

## Prisma 7 nao abre conexao sozinho — driver adapter e obrigatorio

**27/08/2026.** O handoff listava `@prisma/client` e mais nada. Nao basta: na v7 o
`PrismaClient` so aceita `adapter` ou uma URL do Accelerate — o modo em que o proprio client
abria a conexao a partir da `datasource` saiu. Sem `@prisma/adapter-pg` o TypeScript recusa o
construtor, e a mensagem nao diz o que falta instalar.

Junto disso: a tag `latest` do CLI `prisma` estava em `8.0.0-rc.12` enquanto `@prisma/client`
estava em `7.10.0` estavel. `pnpm add` pega `latest` dos dois e monta majors diferentes.

**Regra:** ao instalar Prisma, conferir `npm view prisma dist-tags` e `npm view @prisma/client
dist-tags` antes de aceitar o que veio, e ja adicionar o adapter do banco (`@prisma/adapter-pg`
no Postgres, que traz o `pg` junto). Instanciar o client dentro de uma funcao, nao no import,
senao o `next build` sem `DATABASE_URL` quebra.

---

## Editar migration ja aplicada exige reset

**27/08/2026.** Indice parcial e `CHECK` nao saem do schema do Prisma, entao vao a mao no
`migration.sql`. Mas editar o arquivo **depois** de `migrate dev` ja ter aplicado quebra o
checksum guardado em `_prisma_migrations`, e a proxima migration reclama.

Dois caminhos: `migrate reset` (apaga o banco e reaplica do zero, deixando uma migration unica)
ou uma segunda migration so com o SQL manual (aditiva, nao destroi nada).

O `migrate reset` da v7 exige consentimento explicito do usuario — recusa rodar e manda pedir,
aceitando so via `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` com o texto da resposta.

**Regra:** decidir antes de rodar `migrate dev` se aquela migration vai ter SQL manual. Se vai,
gerar com `--create-only`, editar, e so entao aplicar — nao ha checksum para quebrar. Contar as
linhas do banco antes de qualquer reset, e perguntar.

---

## Teste verde nao prova invariante — quebrar de proposito, de novo

**27/08/2026.** Depois da mordida do boundaries, o mesmo metodo foi aplicado aos testes de banco
antes de dar a tarefa por feita:

| O que foi quebrado | O que ficou vermelho |
|---|---|
| `where: { userId, mediaId }` virou `where: { mediaId }` | os 2 testes de privacidade |
| `DROP INDEX "ReadingSource_userId_mediaId_active_key"` | o teste da segunda fonte ativa |

Os dois foram restaurados e a suite voltou a 10 verdes.

**Regra:** invariante que a nota depende (privacidade do progresso, indice parcial) so conta como
provado depois de ver o teste falhar com a regra removida. Vale para schema e banco tanto quanto
para config de lint.

---

## PowerShell 5.1 quebra argumento multilinha com aspas duplas internas

**01/09/2026.** Duas vezes na mesma sessao: here-string `@'...'@` passado como
argumento de exe nativo (`gh pr create --body`, `git commit -m`) estourou com
"unknown arguments" / "pathspec did not match" quando o texto continha aspas
duplas internas ("Configurar leitura", "Na estante"). O parser de argumentos
nativos do Windows PowerShell 5.1 recorta no `"` interno mesmo vindo de
here-string literal.

**Regra:** mensagem/corpo multilinha com aspas duplas vai por arquivo
(`--body-file`, `git commit -F`) ou perde as aspas. Nao insistir no here-string
inline — o erro so aparece na execucao.

---

## Botao nao promete o que o sistema nao controla

**01/09/2026.** Correcao do usuario: com fonte de pagina da obra, o botao dizia
"Abrir obra + registrar cap. 2" mas abria sempre a pagina salva (o link colado,
que era do capitulo 1). O sistema registrava um capitulo que nao tinha como
saber se foi lido, e abria um lugar que nao era o prometido.

**Regra:** rotulo de acao descreve APENAS o que o codigo faz de verdade. Se o
sistema nao controla o resultado (nao sabe qual capitulo a pagina vai mostrar,
nao sabe onde o usuario parou), a acao nao registra nada em silencio — vira
acao explicita do usuario (edicao manual do capitulo). Registro automatico so
quando a informacao e real (template resolve o capitulo; extensao le a pagina).

---

## gh com duas contas: a ativa troca sozinha e o push da 403

**01/09/2026.** Duas contas logadas no gh (`NicholasSchlindwein-dev`, com
permissao no repo, e `NicholasSchlindwein`, sem). Duas vezes na sessao o push
falhou com 403 porque a conta ativa tinha trocado — e `gh auth setup-git`
sozinho nao resolve, porque o helper usa a conta ATIVA.

**Regra:** push com 403 inesperado → `gh auth status` primeiro. Se a ativa for
a errada: `gh auth switch --user NicholasSchlindwein-dev` e so entao
`gh auth setup-git` + push.

---

## Identidade visual — nao ecoar o Letterboxd

**31/08/2026.** Duas correcoes do usuario na primeira rodada de identidade: (1) os temas sumi e
matcha eram ambos papel-claro com branco de superficie — na tela, "iguais, so muda a cor do
logo"; (2) o seletor de tema com tres bolinhas coloridas lado a lado reproduzia a assinatura
visual do logo do Letterboxd.

**Regra:** o Letterboxd e benchmark de produto, nao de estetica — elemento visual que evoca a
marca deles (trio de circulos coloridos, em especial) nao entra. E temas so contam como opcoes
distintas se o **fundo** muda de verdade entre eles; trocar so o acento nao e um tema novo.
Matcha virou meio-termo real (verde-oliva dim) e o seletor virou controle segmentado com texto.

**Nuance (01/09, decisao do usuario):** bolinhas de tema voltaram por pedido explicito, mas como
SWATCH funcional — cada uma com as duas metades das cores do PROPRIO tema (fundo + acento),
nao o trio solido laranja/verde/azul da marca deles. A regra continua valendo para cores/arranjo
que imitem o logo do Letterboxd.

---

## "Fecha #NN" em portugues nao fecha issue no GitHub

**03/09/2026.** Cinco PRs mergeados com "Fecha #NN" no corpo; nenhuma issue
fechou sozinha. O GitHub so reconhece as palavras-chave em ingles (close,
closes, fixes, resolves...). Foi preciso fechar as cinco a mao depois.

**Regra:** no corpo do PR usar `Closes #NN` (a frase pode continuar em
portugues em volta). Ou fechar a issue com `gh issue close` no fim, com o
comentario-resumo que o workflow ja pede.

---

## PR empilhado morre quando a base e apagada

**03/09/2026.** O #77 tinha base em `feature/seguir-usuarios` (empilhado no
#75). O merge do #75 com `--delete-branch` apagou a base e o GitHub FECHOU o
#77 em vez de reapontar para `main` — e PR fechado nao aceita `gh pr edit
--base`. Precisou de PR novo (#83) da mesma branch.

**Regra:** antes de mergear a base de uma pilha, reapontar os PRs de cima
(`gh pr edit N --base main`) — ou mergear a base SEM `--delete-branch` e
apagar a branch so depois que a pilha inteira entrou. Conflito em
`tasks/todo.md` entre branches paralelas e esperado: as duas anexam secoes
no fim; resolver mantendo os dois lados em ordem cronologica.


---

## Merge so com o check verde — condicionar, nao encadear (05/09)

**O que aconteceu:** num mesmo comando encadeei `gh pr checks --watch` e
`gh pr merge`. O check falhou (teste flaky) e o merge rodou mesmo assim, porque
o `merge` nao dependia do resultado do `checks`. Codigo com teste vermelho no CI
entrou na main (#124).

**Regra:** o merge so roda depois de ler o estado do JOB "lint, testes e
build", nao do conjunto: o check "Vercel" (preview) falha em todo PR, entao o
exit code de `gh pr checks` e sempre != 0 e nao serve de portao. Forma que
funciona: laco em `gh pr checks <ref> --json name,state`, esperar o job sair
de PENDING, mergear so em SUCCESS. Logo apos o push o job ainda nao existe
("no checks reported") — esperar, nao tratar como vermelho. Nunca
`checks; merge`.

## Ordenar por `createdAt` sozinho e flaky (05/09)

`TIMESTAMP(3)` tem milissegundo. Linhas criadas em laco caem no mesmo ms e a
ordem fica ao acaso — passou local, quebrou no CI. Toda `orderBy` de lista que
precisa de ordem estavel leva desempate por `id` (cuid e monotonico no
processo), e paginacao usa cursor por `id`, nunca `createdAt < x`.

## Migration criada a mao quando o `--create-only` recusa (05/09)

`prisma migrate dev --create-only` recusa em ambiente nao interativo quando a
mudanca exige confirmacao (coluna NOT NULL em tabela com linhas). Saida:
criar a pasta `prisma/migrations/<timestamp UTC>_<nome>/migration.sql` a mao e
rodar `migrate dev` para aplicar. Usar `date -u` no timestamp: o relogio local
(UTC-3) gerou uma pasta que ordena ANTES de migrations mais antigas.

## Entregavel de auditoria e .md no repo + issue, nao artifact (06/09)

Terminei a auditoria de seguranca e tentei publicar o relatorio como artifact.
Errado por dois motivos: o artifact vive fora do repo, entao o achado nao entra
no fluxo de trabalho do projeto; e o CLAUDE.md ja diz que toda implementacao
gera issue. **Regra:** resultado de auditoria ou de analise vira arquivo `.md`
versionado no vault (`Obsidian/04. BUGS/Criar Issue Antes de Fazer/` quando os
achados precisam virar issue antes de alguem pegar) mais uma issue por achado,
com o `.md` como fonte de verdade e a issue apontando para ele. Nao propor
artifact para entregavel que o time vai perseguir depois.


## `--delete-branch` mata a PR de cima numa pilha (07/09/2026)

**O que tentei:** mergear seis PRs empilhados com
`gh pr merge <n> --merge --delete-branch`, na ordem.

**O que aconteceu:** o merge do primeiro apagou `feature/i18n-infra`, que era a
BASE do segundo. O GitHub nao retargetou o #150 para a `main` — **fechou** ele.
E PR fechada com base inexistente nao reabre: `reopenPullRequest` responde
"Could not open the pull request". Foi preciso abrir um PR novo (#155) da mesma
branch para a `main`.

**A regra:** em pilha de PRs, **retargetar antes de mergear**, e so apagar branch
no fim.

```bash
# ordem certa
gh pr edit 151 --base main
gh pr edit 152 --base main   # todas de uma vez, antes de qualquer merge
gh pr merge 150 --merge      # SEM --delete-branch
gh pr merge 151 --merge
...
git push origin --delete feature/x  # limpeza so no fim
```

Nenhum commit se perde nesse acidente — a branch de cima continua intacta —, mas
o PR e sua descricao vao junto, e a auditoria do historico fica com um numero
fechado sem merge no meio.


## Verde em lint, teste e build nao prova que a saida esta certa (07/09/2026)

Tres defeitos da #116 passaram pelos tres portoes. Todos apareceram so ao olhar
o que o servidor de verdade devolveu:

1. **O matcher do proxy barrava todo link antigo.** `/catalogo` dava 404: o ponto
   escapado virou ponto solto no literal TypeScript (`"\."` -> `"."`) e o
   lookahead negativo passou a excluir quase toda rota. O teste que consertou
   **le `src/proxy.ts`**, nao uma copia — `matcher` e analisado estaticamente
   pelo Next, entao a copia pode estar certa enquanto o que roda esta errado.
   Foi exatamente o que aconteceu na primeira tentativa de conserto, com a
   constante importada sendo ignorada em silencio.
2. **Trocar de idioma apagava o tema escolhido.** O `lang` do `<html>` muda, o
   React re-renderiza o elemento e leva junto o `data-theme` posto pelo script
   inline. `suppressHydrationWarning` so vale na hidratacao, nao em update.
3. **O `hreflang` saia com URL relativa e era ignorado pelo buscador.** Sem
   `metadataBase` o Next deixa `alternates.languages` relativo, e o build nao
   reclama. A tag estava no HTML sem servir para nada.

**A regra:** feature que muda ROTA, CABECALHO ou METADATA so esta pronta depois
de `curl` na resposta de verdade. Os tres portoes leem o codigo; nenhum le a
saida.

Corolario do escape: quando um padrao precisa de barra invertida dentro de string
(regex em `matcher`, por exemplo), preferir a forma que dispensa o escape —
`[.]` no lugar de `\.` — e um nivel a menos de coisa para errar sem ninguem ver.


## Senha de conta de teste morre com a sessao (08/09/2026)

`tasks/todo.md:607` registrou "senha no historico da sessao, nao aqui" ao criar a
conta `provadona`. A decisao de nao versionar credencial esta certa, mas a
consequencia so apareceu tres dias depois: sessao nova, senha inacessivel, e a
unica conta com estante pronta virou intestavel. Como o `passwordHash` e scrypt,
nao ha leitura de volta.

Custou uma excecao consciente a uma regra absoluta: alterar o banco a mao para
regravar o hash. Feita so no banco `localhost` (o script recusa qualquer outra
string de conexao), com `gerarHashDeSenha` do proprio dominio em vez de hash
inventado, e provada com `curl` no `POST /api/v1/sessao` — 200 e cookie emitido.

**A regra:** conta de teste que precisa sobreviver a sessao nasce por script
versionado (seed), nao por cadastro manual com senha no chat. Enquanto nao
existir seed, criar a conta com senha deterministica anotada no `.env.example`
como valor de exemplo — nunca com senha que so o historico guarda.

Corolario: dependencia de terceiro fora (AniList, 08/09/2026) transforma
"e so criar outra conta" em bloqueio — `estante.service.ts:88` recusa adicionar
obra sem AniList, e sem estante o popup da extensao nem abre o formulario. O seed
resolveria os dois de uma vez.

## Mergear deixa o repo na `main`, e o proximo commit cai la (08/09/2026)

Depois de `gh pr merge` + `git checkout main` + `git pull` para atualizar, o commit
seguinte foi para a `main` direto — a regra absoluta que o CLAUDE.md lista primeiro.
Nada tinha sido enviado, entao bastou `git branch <nova>` no commit e
`git reset --hard origin/main` na `main`.

**A regra:** terminar todo merge criando a branch da proxima tarefa na hora, ou conferir
`git branch --show-current` antes do primeiro `git add` de qualquer trabalho novo. O
estado "acabei de mergear" e exatamente onde a inercia leva para o lugar errado.

## Mudar o que um campo aceita e revisar TODA frase que o cita (08/09/2026)

Na #166 o campo de entrar passou a aceitar nome de usuario. Rotulo atualizado nos
cinco idiomas, contrato da API atualizado, testes verdes — e a mensagem de erro
continuou "e-mail ou senha incorretos". So apareceu no teste manual do usuario.

**A regra:** ao mudar o que um campo aceita ou significa, buscar no `messages/`
TODA frase que o mencione — rotulo, placeholder, erro, ajuda, e-mail — nao so a
que esta ao lado do input. `grep -rn "e-mail" messages/pt-BR.json` teria mostrado
em segundos.

## Dev rodando + rebase = bundle velho parecendo bug (08/09/2026)

Depois de um rebase com o `pnpm dev` no ar, a tela mostrou a chave crua
`entrar.campos.email` e o login por nome falhou. Parecia bug da #166 recem-mergeada;
era o bundle do cliente antigo servindo o componente velho com o JSON de mensagens
novo. Custou um round-trip com o usuario e um print de "falha" que nao era.

**A regra:** depois de rebase, merge ou troca de branch com o dev rodando, matar o
processo, apagar `.next` e subir de novo ANTES de pedir teste manual. E provar com
`curl` que a pagina serve o markup novo antes de mandar alguem olhar.

## `grep -c "frase"` na pagina nao prova que o botao existe (08/09/2026)

Sondando se o "Resetar leitura" tinha saido da pagina da obra, `grep -c` achou 1 —
mas era o catalogo do `next-intl`, que embute o namespace inteiro no payload
quando qualquer componente da pagina usa `useTranslations("obra")`. O botao ja
nao estava la.

**A regra:** sondar pelo MARKUP renderizado (`>Resetar leitura</button>`), nunca
pela frase solta. Frase solta aparece no JSON de mensagens de qualquer pagina que
carregue o namespace.

## Script grande por heredoc quebra o shell antes de rodar (08/09/2026)

Tres vezes na mesma sessao um bloco Python de 100+ linhas passado por `<<'PY'`
morreu com "unexpected EOF while looking for matching quote" — e como o erro e de
ANALISE, nada do comando roda, nem o que vinha antes. Custou round-trips e um
commit que parecia feito e nao estava.

**A regra:** edicao multi-arquivo vai para um `.py` no scratchpad (escrito pela
ferramenta de arquivo, nao pelo shell) e roda com `python arquivo.py`. Heredoc so
para bloco curto. E depois de qualquer falha de shell, `git status` antes de
assumir que algo foi aplicado.

## Duas sessoes na mesma copia do repo: o trabalho some e o commit vai para a branch errada (09/09/2026)

Enquanto eu mexia nas issues de seguranca, o usuario trabalhava na #182 na MESMA
pasta. O que aconteceu, em ordem: minhas tres edicoes foram parar num
`git stash` que eu nao criei ("WIP ... antes de retomar issue 182"), o
`git commit` respondeu "nothing to commit, working tree clean", e mais adiante um
commit meu caiu na branch `desenvNovoDesignCatalogo`, que era a dele — a branch
tinha trocado embaixo de mim entre um comando e outro.

Nada se perdeu: o stash foi recuperado com `git stash pop`, e o commit foi salvo
com `git format-patch` antes de `git reset --mixed` devolver a branch dele
intacta. Mas custou tempo e quase contaminou o trabalho do outro lado.

Sinal de alerta que apareceu antes do problema: `pnpm test` deu 56 arquivos numa
rodada e 53 na seguinte, sem eu ter mexido em teste nenhum. Contagem de suite que
muda sozinha significa que a arvore mudou por fora.

**A regra:** ao trabalhar em paralelo com outra sessao no mesmo repositorio,
`git worktree add ../<pasta> <branch>` e trabalhar la — indice, HEAD e working
tree proprios. Copiar o `.env` (nao versionado) e rodar `pnpm install` na
worktree; o `pnpm` usa store global, entao e rapido. Nunca `git add -A` numa
arvore compartilhada: `git add` por arquivo, sempre.

## Provar na tela sem dizer QUAL servidor esta rodando o codigo novo (09/09/2026)

Baixei o carrossel da home de 12 para 10 itens e segui trabalhando. O usuario
mandou um print: "mas ali mostra que tem 12". Estava certo — o `pnpm dev` que ele
tinha aberto servia a `main`, sem a minha mudanca, que vivia numa branch nao
mergeada.

**A regra:** mudanca de tela so vira prova no servidor que roda o codigo dela.
Subir o dev da propria branch em outra porta, conferir ali, e dizer explicitamente
que o servidor do usuario continua na `main` ate o merge. Sem isso o print dele
mede outra coisa e a conversa gasta um round-trip.

Corolario que apareceu no mesmo dia: o contador do carrossel (`{centro + 1} / {total}`)
e renderizado no cliente e NAO existe no HTML servido — procurar por ele com
`grep` no `curl` nao acha nada. Contar o MARKUP do card, lembrando que o carrossel
renderiza um card fantasma `aria-hidden` para medir largura: 11 no HTML sao 10 na
tela.

## Teto por autor em lista mesclada vale sobre a MESCLA, nao por fonte (09/09/2026)

Na #144 apliquei "no maximo 2 por autor" nas resenhas e nas listas separadamente,
e o feed da home continuou deixando a mesma conta ocupar QUATRO linhas — 2 de cada
fonte. O teste unitario passava, porque testava uma fonte de cada vez; o furo so
apareceu ao contar autor por autor no HTML da home de verdade.

**A regra:** quando o produto final e UMA lista, o limite por autor se aplica
depois da mescla, e a funcao que mescla recebe o tamanho da BUSCA, nao o do
resultado. Quando sao trilhos visualmente distintos (dois carrosseis), o teto por
trilho e o certo. Decidir isso olhando a tela, nao a assinatura da funcao.

E o teste que garante isso precisa de uma conta presente nas DUAS fontes — com
uma fonte so, as duas formas passam igual.

## `pnpm test` nao faz type-check; `pnpm build` faz — inclusive nos testes (09/09/2026)

Adicionei uma dependencia obrigatoria a `DependenciasDoCatalogo` e ajustei os
testes que usavam a nova propriedade. Lint verde, 600 testes verdes, push — e o
CI vermelho com **doze** `TS2345: Property 'limitar' is missing`, todos em
`tests/services/catalogo.service.test.ts`.

O vitest transpila sem checar tipo. Quem checa e o `next build`, e ele checa o
`tests/` junto. Entao teste que monta objeto de dependencia na mao quebra o BUILD
sem quebrar o TESTE.

**A regra:** ao mudar a forma de um tipo que os testes constroem — campo novo
obrigatorio em `Dependencias*`, retorno com variante nova —, rodar `pnpm build`
antes do push, nao so `pnpm lint` e `pnpm test`. E preferir `{ ...fakeDeps(), x }`
a montar o objeto inteiro em cada teste: uma fabrica so absorve o campo novo em
um lugar, doze objetos literais nao.

## Worktree com CRLF faz o Prisma pedir reset do banco de desenvolvimento (09/09/2026)

`pnpm prisma migrate dev` na worktree respondeu que duas migrations de 01/09
"foram modificadas depois de aplicadas" e que precisava **resetar o schema**,
apagando o banco de desenvolvimento inteiro — com os dados de teste do usuario e
o trabalho dele em andamento.

Nao havia modificacao nenhuma: `git log` mostrava um commit por arquivo, sem
alteracao posterior. A diferenca era o FIM DE LINHA. O `git worktree add` fez
checkout com `core.autocrlf` ligado e gravou CRLF; a copia original tem LF, e foi
dela que o checksum guardado em `_prisma_migrations` foi calculado. O Prisma
compara o arquivo byte a byte.

| copia | bytes | CRLF |
|---|---|---|
| original do usuario | 1500 | 1 |
| worktree | 1543 | 44 |

**A regra:** "migration modificada depois de aplicada" com `git log` limpo e
Windows no meio e' fim de linha, nao corrupcao. NUNCA aceitar o reset para sair
disso. Conferir com `python -c "print(open(f,'rb').read().count(b'\r\n'))"` nas
duas copias e igualar os bytes — o que funcionou foi copiar os arquivos de
migration da copia original para a worktree, rodar `migrate dev`, e restaurar os
arquivos com `git checkout --` depois, para nao commitar troca de EOL.

Antes disso: `git config core.autocrlf false` na worktree, senao o proximo
checkout recria o problema.

## Banco de preview por PR estoura o Free do Neon e aparece como check da Vercel (09/09/2026)

O check **Vercel** falhava em TODO preview desde o #92, com producao passando no
mesmo commit. A #162 investigou por semanas e parou em duas hipoteses erradas:
"e a migration rodando contra banco invalido" (caiu quando o #205 fez o script
pular fora de producao, e o preview seguinte continuou vermelho) e "e variavel de
ambiente faltando no Preview".

Nao era nenhuma das duas. O log do deployment dizia, na etapa **Provisioning
Integrations**, antes de instalar qualquer dependencia:

```
mymangatracker: Create database branch for deployment
Branch limit reached. Upgrade your plan or delete unused branches.
```

A integracao Neon cria uma branch de banco por preview deployment. Ninguem
apagava. O Free do Neon para em **10 branches**. Na decima o teto bateu e desde
entao todo preview morria em 1s, antes do build. Por isso o bot comentava
`previewUrl: ""` — o deployment nunca chegava a existir.

**A regra:** deployment que falha em **1s** nao falhou no build. Antes de teorizar
sobre codigo, variavel ou migration, abrir o deployment e expandir as etapas: o
que quebra antes de instalar dependencia e provisionamento de integracao ou
quota, e o log diz qual em uma linha. E recurso que cria artefato por PR (branch
de banco, ambiente efemero) precisa de limpeza automatica ou de um teto, senao a
falha chega disfarcada de outra coisa semanas depois.

Correcao aplicada: as 9 branches orfas apagadas e o recurso Neon restrito a
`Production environment only` na Vercel — preview e development nao recebem mais
banco, o build passa e a tela degrada com o aviso de configuracao pendente, que e
o comportamento desenhado na Fase 1.

## Aba oculta do Chrome parece página travada

- **Tentativa**: screenshot e sonda com `requestAnimationFrame` numa aba do Chrome; ambos estouraram 30-45 s e a ferramenta disse "renderer may be frozen". Fui atrás de bug na prateleira (ResizeObserver, capas, CSS) por meia hora.
- **Erro**: a aba estava com `document.visibilityState === "hidden"` (janela minimizada ou outra aba/janela na frente). Aba oculta não pinta frame: `Page.captureScreenshot` não retorna e `requestAnimationFrame` nunca dispara. JS sem rAF respondia na hora.
- **Regra**: antes de diagnosticar "travou", rodar `document.visibilityState` pelo `javascript_tool`. Se vier `hidden`, o problema é a janela, não a página. Sonda de desempenho usa `setTimeout`/`PerformanceObserver` (longtask), nunca rAF. Uma aba por vez para captura: ação em outra aba tira a primeira do primeiro plano.
- **Mais dois sintomas da aba oculta** (09/09/2026): transição CSS fica congelada no meio (livro com `width` computada de 168 px sem regra nenhuma dando isso — `li.style.transition = "none"` resolve na hora) e `:focus`/`:focus-within` não casam porque `document.hasFocus()` é falso. Prova de largura em aba oculta: zerar transições antes de medir; prova de foco/hover: só com janela visível.
