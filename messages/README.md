# Os catálogos de mensagem

Um arquivo por idioma. `pt-BR.json` é a **referência**: é dele que saem os tipos
das chaves (`src/i18n/mensagens.d.ts`), então `t("chave.que.nao.existe")` não
compila, e é contra ele que todos os outros são conferidos.

## Acrescentar um idioma

Três passos. Nenhum deles é em código de tela.

1. **`src/i18n/routing.ts`** — pôr o código no array `locales`.

   ```ts
   locales: ["pt-BR", "en", "es"],
   ```

   Só isso já liga: negociação por `Accept-Language`, prefixo na URL
   (`/es/obra/30002`), redirect de link antigo, `<html lang>`, botão no seletor
   do header (a sigla `ES` sai do próprio código) e o nome do idioma no `title`
   (`Intl.DisplayNames`, escrito no próprio idioma).

2. **`messages/<codigo>.json`** — copiar `pt-BR.json` e traduzir. Mesma árvore de
   chaves, mesma ordem.

3. **`extension/_locales/<codigo>/messages.json`** — o Chrome escreve a pasta com
   underline (`pt_BR`, não `pt-BR`). Copiar de `_locales/en/` e traduzir.

## O que o CI cobra sozinho a partir daí

`tests/i18n/` lê `routing.locales`, então o idioma novo entra **coberto**, sem
ninguém editar teste:

| Regra | O que ela pega |
|---|---|
| paridade de chaves | chave que ficou sem tradução, e chave que o novo idioma inventou |
| valor vazio | `""` deixado para preencher depois |
| argumentos ICU | `{valor}` traduzido para `{value}` — quebra a tela e some com o número |
| **categorias de plural** | o erro que mata idioma novo: copiar o `one`/`other` do inglês para uma língua que precisa de mais |
| categoria inexistente | `few` num idioma que não tem `few` — nunca casa, e ninguém percebe |
| catálogos da extensão | pasta `_locales/` faltando, chave só num idioma, placeholder divergente |
| códigos de erro | código da API sem frase, e frase de código que não existe |

### Sobre plural, que é onde dói

O CLDR exige formas diferentes por idioma:

| idioma | formas |
|---|---|
| `en` | `one`, `other` |
| `pt-BR`, `es` | `one`, `other`, `many` |
| `ru` | `one`, `few`, `many`, `other` |
| `ar` | `zero`, `one`, `two`, `few`, `many`, `other` |
| `ja`, `zh` | só `other` |

Escrever `{n, plural, one {…} other {…}}` em russo **passa em tudo que não seja
este teste** e renderiza errado para 2, 3, 4, 5… A regra é:

- declarar **todas** as formas que o idioma exige; **ou**
- declarar **só `other`**, que significa "a palavra não varia" — é o caso de
  "seguindo"/"following".

Declarar pela metade é o descuido, e é o que quebra. Se uma forma tem de fato o
mesmo texto de `other` no idioma, registre a dobra em `PLURAL_DOBRADO_EM_OUTRO`
(em `src/i18n/routing.ts`) **com o motivo** — é decisão, não esquecimento.

## O que NÃO é automático

- **Fonte.** `src/app/(ui)/[locale]/layout.tsx` carrega as fontes com
  `subsets: ["latin"]`. Cirílico, grego, japonês ou árabe caem na fonte do
  sistema até alguém acrescentar o subset.
- **Direita para a esquerda** (árabe, hebraico). São ~29 `className` com lado
  físico (`left-4`, `pl-`, `border-r`) que precisariam virar propriedade lógica,
  mais `dir` no `<html>`. É trabalho de CSS, não de catálogo, e não fica mais
  barato por já existir um segundo idioma.
- **Conteúdo.** Título e sinopse vêm do AniList; resenha, lista e bio são de quem
  escreveu. Nada disso se traduz.

## Convenções

- Chave pelo **papel**, nunca pela frase: `estante.vazia`, jamais
  `suaEstanteEstaVazia`. A frase muda; o papel não.
- Um namespace por tela. `comum` guarda só o que aparece em três ou mais telas.
- Plural **sempre** por ICU. Nunca `n === 1 ? "obra" : "obras"` no código — a
  regra de lint em `src/app/(ui)/**` barra texto solto, mas quem escreve o
  ternário dentro de uma chave passa.
- Nome de argumento (`{valor}`, `{termo}`, `{username}`) e nome de tag de rich
  text (`<forte>`, `<link>`) ficam **em português em todos os idiomas**: são
  contrato com o código, não texto.
- `erros` é o namespace dos códigos da API. Uma chave por código de
  `src/app/api/v1/_shared/erros.ts`, com o mesmo nome.
