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

**Regra:** `gh pr checks <ref> --watch` tem exit code != 0 quando algum check
falha. O merge SEMPRE vem atras de `&&` desse comando, ou de um `if` explicito.
Nunca `checks; merge`. E ler a saida antes de dizer "mergeado".

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
