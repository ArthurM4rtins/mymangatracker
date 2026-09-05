# feature-i18n — o site em mais de um idioma

Issue: #116. Desenho de 05/09/2026. **Aguardando aprovação** (ver Pendências).

## Objetivo

O Kidoku hoje é 100% pt-BR, hardcoded em 47 componentes, 22 rotas de API e
7 formatadores de data. O site pode ser usado por gente do mundo todo: idioma
da interface, das mensagens de erro e dos formatos (data, nota) tem que seguir
quem está lendo, sem regressão para quem lê em português.

## Escopo

Entra:

1. Interface inteira (`src/app/(ui)`): textos, `aria-label`, `placeholder`,
   `<title>`/description do `generateMetadata`, `<html lang>`.
2. Erros da API: deixam de ser frase e viram **código**; a tela traduz.
3. Datas, horas relativas ("há 3 dias"), nota (`4,5` vs `4.5`).
4. Idioma na URL (`/en/obra/30002`, `/pt-BR/obra/30002`) e negociação por
   `Accept-Language` na primeira visita.
5. Preferência salva na conta (`User.locale`) para quem está logado.
6. Extensão (#91): `_locales/` do MV3, alinhada com os mesmos idiomas.

Não entra:

- Conteúdo do AniList (sinopse, gêneros) — já vem em inglês, fica como está.
- Conteúdo de usuário (resenha, lista, bio) — nunca se traduz.
- Curadoria narrativa (`data/story-structures/`, #16) — nomes de arcos em
  inglês; decidir na #16 se ganham pt-BR.
- Marca: "Kidoku", logo, `SIMBOLO` ✦.
- Plataforma de tradução (Crowdin etc.) — dois idiomas, dois integrantes,
  JSON revisado à mão basta.

## Medições (05/09)

| O quê | Quanto |
|---|---|
| `.tsx` em `src/app/(ui)` | 47, dos quais **34 são `"use client"`** |
| `erros: {...}` em português na API | 116 ocorrências, 22 rotas |
| Mensagens do Zod com texto | 4 |
| `Intl.*Format`/`toLocaleString` fixos em pt-BR | 7 |
| Plurais à mão (`=== 1 ? "obra" : "obras"`) | 16 |
| Estados dos serviços | já são códigos (`nao_encontrada`, `sem_fonte`…) |

Os 34 client components decidem a biblioteca: `next/root-params` (a forma
nativa do Next 16 de ler `[lang]`) **não roda em client component**. Precisa
de um provider que leve as mensagens ao cliente — é o que o next-intl faz.

## Decisões tomadas

### D1. Idiomas: `pt-BR` e `en`. Fallback `en`.

- Visitante sem cookie: `Accept-Language` negociado contra `["pt-BR", "en"]`.
  `pt`, `pt-PT` → `pt-BR`; qualquer outra coisa → `en`.
- Terceiro idioma (es, ja) só quando houver quem revise a tradução.

### D2. Idioma na URL, prefixo sempre. Preferência na conta quando logado.

- `localePrefix: "always"`: `/pt-BR/obra/30002`, `/en/obra/30002`. Link
  compartilhado carrega o idioma; cache e SEO não misturam.
- `/obra/30002` (links antigos) → redirect 307 para o idioma negociado, feito
  no `proxy.ts` (Next 16 renomeou middleware para proxy).
- `generateMetadata` ganha `alternates.languages` apontando as duas URLs.
- Logado: `User.locale` (fase 5) vence o cookie; troca no seletor grava nos
  dois. Visitante: cookie `NEXT_LOCALE` (padrão do next-intl).
- `/api/**` **não** tem prefixo. A API fala código, não idioma.

### D3. Biblioteca: `next-intl` 4.14 (peer `next ^16`).

Por quê: App Router + server components + client provider + ICU
(plural, interpolação) + `useFormatter` para data/número + tipagem das chaves.
Alternativas descartadas: Paraglide (menos exemplos com Next 16, compila
mensagens em código gerado — mais um generator no build), à mão (sem ICU; os
16 plurais viram 16 `if`s em dois idiomas, e regride).

Peças (nomes do next-intl):

```
messages/pt-BR.json, messages/en.json       # fora de src: sem camada, sem lint
src/i18n/routing.ts                          # locales, defaultLocale, localePrefix
src/i18n/request.ts                          # carrega messages do locale pedido
src/proxy.ts                                 # createMiddleware(routing) — redirect/negociação
src/app/(ui)/[locale]/layout.tsx             # root layout desce um nível; <html lang>
                                             # + NextIntlClientProvider
next.config.ts                               # createNextIntlPlugin()
```

Camadas (`eslint-plugin-boundaries`): `src/i18n/**` vira element `i18n`, que
não importa nada do projeto e é importável por `ui`, `controller` e pelo
`proxy`. `src/proxy.ts` vira element `proxy`, importa só `i18n`. Comprovar
quebrando, como manda o CLAUDE.md.

### D4. Onde vive o texto: um namespace por tela, chave descritiva.

```json
{
  "comum": { "salvar": "Salvar", "cancelar": "Cancelar", "carregando": "Salvando…" },
  "estante": { "titulo": "Sua estante", "vazia": "Sua estante está vazia…",
               "status": { "READING": "Lendo", "COMPLETED": "Concluído", "PAUSED": "Pausado", "PLANNED": "Planejo ler", "DROPPED": "Abandonado" } },
  "obra": { "suaAvaliacao": "Sua avaliação", "resenhar": "Resenhar…",
            "aberturas": "{n, plural, =1 {# abertura} other {# aberturas}}" }
}
```

- Chave é o **papel**, não a frase: `estante.vazia`, nunca `suaEstanteEstaVazia`.
- Plural só via ICU. Os 16 `=== 1 ?` morrem.
- `messages/pt-BR.json` é a fonte de tipos: `declare module` com
  `Messages = typeof import("../messages/pt-BR.json")` → `t("chave.errada")`
  não compila.
- Teste unitário `tests/i18n/mensagens.test.ts`: todo caminho de chave de
  `pt-BR` existe em `en` e vice-versa; nenhum valor vazio. Roda no CI.

### D5. Erros da API viram código. A tela traduz.

Hoje: `{ erros: { _geral: "lista não encontrada" } }`. Passa a:
`{ erros: { _geral: "lista_nao_encontrada" } }` e, por campo,
`{ erros: { email: "email_invalido", senha: "senha_curta" } }`.

- Códigos em `snake_case`, catálogo único em `src/app/api/v1/_shared/erros.ts`
  (`as const`) — o mesmo arquivo alimenta o namespace `erros` das messages e
  a extensão. Código sem tradução falha no teste de D4.
- Zod: `z.config({ customError })` (Zod 4) devolvendo código por `issue.code`
  + campo; as 4 mensagens com texto viram código.
- Serviços já devolvem código de estado; o controller só mapeia estado →
  código HTTP + código de erro. Nada de texto de produto no controller —
  casa com "controller nunca contém regra de negócio".
- **Quebra de contrato**: quem consome `erros._geral` como frase (telas,
  extensão) atualiza junto. Uma virada só, na fase 3, com todos os
  consumidores no mesmo PR ou em PRs encadeados sem deploy no meio.

### D6. Formatos: pelo idioma ativo, hora pelo navegador.

- `useFormatter()` do next-intl para data, hora relativa e número.
- `DataHora` (client, #102) continua: hora exata no fuso do navegador.
  next-intl no servidor formata em UTC salvo `timeZone` explícito — para hora
  exata, formatar no cliente é a única forma correta sem saber o fuso.
- Nota: `format.number(4.5)` → `4,5` / `4.5`.
- **Número de capítulo NÃO é localizado**: `cap. 57.5` nos dois idiomas. É
  identificador (bate com a URL e com o site de leitura), não quantidade.

### D7. Título da obra por idioma.

`en`: `titleEnglish ?? titleRomaji`. `pt-BR`: idem (AniList não tem
português). `titleNative` continua secundário nos dois. Sem mudança de dado.

### D8. Lint contra texto solto.

`react/jsx-no-literals` (já vem no eslint-config-next) só em
`src/app/(ui)/**`, com `noStrings: true, ignoreProps: true` e
`allowedStrings` para pontuação/símbolo (`·`, `—`, `✦`, `/`, `%`). Liga no
fim da fase 1, quando o pt-BR estiver todo extraído. `ignoreProps: true`
deixa `aria-label`/`placeholder` passar — revisar à mão na fase 2 (grep por
`aria-label="` e `placeholder="` com letra).

### D9. Extensão (#91).

`extension/_locales/en/messages.json`, `extension/_locales/pt_BR/messages.json`
(underscore é regra do Chrome), `"default_locale": "en"` no manifest,
`chrome.i18n.getMessage`. Códigos de erro da API (D5) traduzidos ali também.
Idioma vem do navegador; não lê o cookie do site.

## Fases (cada uma é PR próprio, CI verde, sem deploy quebrado no meio)

1. **Infra sem mudança visual.** next-intl, `[locale]` na rota, `proxy.ts`,
   `messages/pt-BR.json` extraído do que existe, `en.json` = cópia do pt-BR
   (temporário, para o teste de paridade passar), seletor de idioma no header
   ao lado do tema, elements `i18n`/`proxy` no lint. Prova: todas as telas
   idênticas em `/pt-BR/...`, `/obra/30002` redireciona, lint quebrando com
   import proibido de propósito.
2. **`en` de verdade, tela a tela.** Ordem: comum/header → entrar/cadastrar →
   catálogo → obra → estante → listas → perfil (`/u`) → autor → home.
   Um PR por tela; liga `jsx-no-literals` no primeiro e corrige o resto.
3. **API por código.** Catálogo `erros.ts`, Zod com `customError`, 22 rotas,
   telas consumindo código, extensão junto. Um PR encadeado.
4. **Formatos.** `useFormatter` nas 7 datas e na nota; `alternates.languages`
   no metadata; `<html lang>` dinâmico (já vem na fase 1).
5. **Preferência na conta.** `User.locale String?` (migration aditiva),
   `PATCH /api/v1/perfil` aceita, seletor grava, proxy respeita quando há
   sessão.

TDD onde há regra: teste de paridade das messages (fase 1), `customError`
do Zod (fase 3), negociação de `Accept-Language` no domínio se sair do
next-intl (fase 1). Componente de tela e JSON de mensagem não precisam.

## Pendências (aprovar antes de abrir branch)

- [ ] **D1 fallback `en`.** Alternativa: `pt-BR` (público do trabalho). Muda
      só uma linha, mas define o que o professor vê sem cookie.
- [ ] **D2 prefixo sempre.** Alternativa `as-needed` (pt-BR sem prefixo, `en`
      com): URLs atuais continuam válidas sem redirect, mas o idioma padrão
      fica "invisível" na URL e o cache por URL mistura menos limpo.
- [ ] **D5 virada de contrato da API.** Confirmar que pode quebrar
      `erros._geral` como frase (só a tela e a extensão consomem hoje).
- [ ] **D8 rigor do lint.** `ignoreProps: true` deixa passar `aria-label`;
      alternativa `false` gera centenas de falsos positivos em `className`.
- [ ] Ordem das telas na fase 2.

## Referências

- `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`
  (Next 16: `[lang]`, `next/root-params`, `proxy.ts`)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
- next-intl 4.14.2: peer `next ^16.0.0` (npm, 05/09)
- CLAUDE.md raiz: camadas, "controller nunca contém regra de negócio"
- #102 (`DataHora`), #91 (extensão), #16 (curadoria)
