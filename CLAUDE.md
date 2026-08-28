# CLAUDE.md

Guia para o Claude Code neste repositório.

**Antes de qualquer coisa numa sessão nova: ler `tasks/todo.md`.** Ele tem o estado atual,
o que está bloqueado e os próximos passos em ordem.

## MyMangaTracker — guia essencial

Um Letterboxd para mangá, manhwa e novel, com progresso de leitura automático e privado.
Trabalho de faculdade: front-end + back-end + ORM + banco, arquitetura em camadas, deploy.

Integrantes: Arthur Juchem Martins, Nicholas Gabriel Deotti Schlindwein.
Apresentação aprovada: https://claude.ai/code/artifact/10425b3e-b3fd-4013-a3a5-fa18e220e58a

Branches: `main` (produção, deploy automático na Vercel) | `feature/<nome>` (trabalho).

## Princípios

- Comunicação técnica e objetiva.
- Discordar quando necessário.
- Planejar com passos concretos, sem estimar prazos.
- **Simplicity First**: cada mudança o mais simples possível, tocando o mínimo de código.
- **No Laziness**: achar a causa raiz, sem fix temporário.
- **Minimal Impact**: mexer só no necessário.
- **Perguntar antes de impactar**: se a alteração pedida mexe em lógica que já existe, PARAR e
  perguntar antes de implementar. Nunca decidir sozinho sobre efeito colateral. **Vale em modo
  autônomo também** — sobrepõe qualquer instrução de seguir sem perguntar.

## Comandos

```bash
pnpm dev                      # servidor de desenvolvimento
pnpm build                    # prisma generate + migrate condicional + next build
pnpm lint                     # inclui as regras de camada (boundaries)
pnpm test                     # vitest
pnpm test <arquivo>           # teste único

docker compose up -d          # Postgres local
pnpm prisma migrate dev       # cria e aplica migration no dev
pnpm prisma studio            # inspecionar dados
```

`pnpm prisma migrate deploy` é só de produção — nunca rodar contra o banco local à mão.

## Arquitetura em camadas

```
Apresentação   → src/app/(ui)          telas, componentes, design system
Controllers    → src/app/api/v1        valida com Zod, resolve sessão, delega
Serviços       → src/server/services   casos de uso, transações
Repositórios   → src/server/repositories   ÚNICO ponto que importa o Prisma Client
Infra          → src/server/infra      anilist, auth, config
Domínio        → src/server/domain     regras puras, ZERO imports do projeto
```

Dependência tem sentido único. Isso é **cobrado pelo `eslint-plugin-boundaries`**, não é
convenção de boa vontade: se a tela importar repositório, `pnpm lint` falha e o deploy não sai.

Ao mexer na config de boundaries, comprovar que ainda quebra: escrever um import proibido de
propósito, rodar `pnpm lint`, ver falhar, desfazer.

## Regras absolutas

- Controller nunca contém regra de negócio.
- Serviço nunca toca em `Request`, `cookies()` ou `headers()` — quem resolve sessão é o controller.
- Só `repositories/` importa o Prisma Client. O generator do Prisma 7 é o `prisma-client`,
  com saída em `src/generated/prisma`, então o import real é `@/generated/prisma`. O lint
  bloqueia esse e também `@prisma/client` em qualquer camada que não seja `repositories/`.
- `domain/` não importa nada do projeto.
- Resposta de API é DTO do contrato, nunca entidade do Prisma — coluna nova não vaza sem alguém decidir.
- **`ReadingSource` e `ReadingProgress` são privados do dono.** Toda consulta carrega `userId`.
  Nunca aparecem para outro usuário, nunca entram em contagem ou ranking público. Invariante do
  sistema, não preferência do usuário.
- Nunca rodar migration contra produção sem validar antes.
- Nunca alterar o banco manualmente.
- **Nunca commitar nem abrir PR direto na `main`** — trabalho vai em `feature/<nome>`.
- Nunca credencial no código. String de conexão do banco não passa por chat, log ou commit.

## TDD-first

O teste que trava a regra vem **ANTES** da implementação. Escreve o teste → ele **falha por
motivo claro** → só então escreve a função que faz passar. Implementar e depois escrever o teste
é teste de regressão, não TDD, e é violação do fluxo.

Vale para `domain/` e `services/`. Componente de tela e repositório fino não precisam.

Pipeline de uma feature nova:
**teste (domínio/serviço)** → domínio → repositório → serviço → controller → tela → migration
(não aplicar sem validar) → demais testes.

## Convenções

### TypeScript

- `camelCase` para variável e função, `PascalCase` para tipo, componente e classe.
- Constante de módulo em `UPPER_SNAKE_CASE`.
- Arquivo em `kebab-case`: `reading-source.repository.ts`.
- Sufixo pelo papel: `.repository.ts`, `.service.ts`, `.test.ts`.
- Nada de `any`. Se o tipo não fecha, o desenho está errado.

### Banco

- Tabela em `PascalCase`, coluna em `camelCase` — o padrão do Prisma, sem renomear via
  `@@map`/`@map` sem motivo.
- FK sempre com `onDelete` explícito.
- Índice nasce na direção da consulta que ele serve.
- Índice parcial e `CHECK` não saem do schema do Prisma — escrever à mão na migration.

### Domínio

- `Rating`: 0,5 a 5,0, sempre múltiplo de 0,5.
- `chapter`: decimal — existe capítulo 57.5.
- Progresso é o **maior** capítulo aberto, não a contagem de aberturas.
- Progresso pertence à **obra**, não ao site. Trocar de fonte preserva o histórico.

## Git

**Micro commits.** Nunca acumular tudo num super commit. Tarefa que toca várias frentes
(schema + repositório + serviço + controller + tela) quebra em commits atômicos por unidade
lógica, cada um compilando. Alteração pontual é um commit só, sem fragmentar à toa.
Ao preparar commits, propor a divisão com `git add` seletivo por grupo de arquivos.

**Mensagem humanizada** — sem prefixo `feat:`/`fix:`/`Fase N:`. Resumo natural, o que uma pessoa
da equipe escreveria.

**Amend** só se: pedido, hook alterou arquivo, ou commit ainda não enviado.
**Force push** sempre com `--force-with-lease`, nunca na `main`.

## Workflow de tarefas

1. Ao receber uma tarefa, perguntar primeiro: precisa desenhar antes (doc, fluxo, diagrama) ou
   é simples? Não decidir sozinho o caminho.
2. Tarefa simples: issue (`gh issue create`) → implementar → commit referenciando `#XX` →
   fechar a issue com comentário-resumo.
3. Tarefa com desenho: desenhar → aguardar aprovação → issue → implementar → commit →
   **pedir aprovação antes de fechar a issue**.
4. Toda implementação gera issue.

## Tarefa extensa — pasta no Obsidian

Antes de começar, avaliar o tamanho. Se a tarefa toca mais de 3-4 arquivos de domínio distinto,
cria entidade ou fluxo novo, tem decisão de arquitetura em aberto, ou vai passar de uma sessão:
**parar e sugerir** criar `Obsidian/<modulo ou 02. Implementacoes>/<nome-da-branch>/CLAUDE.md`
antes de prosseguir.

Esse `CLAUDE.md` interno vira a fonte de verdade da tarefa. Não duplicar o conteúdo deste
arquivo lá — só o contexto específico: **Objetivo**, **Escopo**, **Regras específicas**,
**Decisões tomadas**, **Pendências**, **Referências**.

Nome da pasta = nome da branch. Nunca pasta de tarefa solta na raiz do vault.

## Lições

Depois de **qualquer** correção do usuário, registrar o padrão em `tasks/lessons.md`: o que se
tentou, por que estava errado, qual a regra que evita repetir. Ler esse arquivo no início de
sessão antes de mexer em área que já mordeu.

## Verificação antes de dizer que acabou

- Nunca marcar tarefa como concluída sem provar que funciona.
- Rodar teste, conferir build, mostrar a saída.
- Se algo falhou, dizer que falhou com a saída — não maquiar.
- Pergunta de controle: um dev sênior aprovaria isso num PR?

## Deploy

`main` → build automático na Vercel → `prisma generate` → migration condicional → `next build`.

**O build não pode depender do banco.** `next build` roda sem `DATABASE_URL`; a migration só roda
quando a variável existe. Página que lê banco vai dinâmica e degrada com aviso de configuração
pendente, nunca estoura.

`DATABASE_URL` é injetada pela integração Neon da Vercel. Nunca colar string de conexão em chat,
commit ou log.
