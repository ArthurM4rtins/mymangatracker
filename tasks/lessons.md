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
