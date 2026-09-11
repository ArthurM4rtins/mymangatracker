import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma Client gerado — codigo de terceiro, nao se revisa.
    "src/generated/**",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**"],
      // A ordem importa: o primeiro padrao que casar define o tipo do arquivo.
      // Por isso `controller` (src/app/api) vem antes de `ui` (o resto de src/app).
      "boundaries/elements": [
        { type: "prisma", partialMatch: false, pattern: "src/generated/**" },
        { type: "controller", partialMatch: false, pattern: "src/app/api/**" },
        { type: "ui", partialMatch: false, pattern: "src/app/**" },
        // Idioma: catalogo, roteamento e negociacao. Nao importa nada do
        // projeto — e importado pela tela, pelo controller e pelo proxy.
        { type: "i18n", partialMatch: false, pattern: "src/i18n/**" },
        { type: "domain", partialMatch: false, pattern: "src/server/domain/**" },
        {
          type: "repository",
          partialMatch: false,
          pattern: "src/server/repositories/**",
        },
        { type: "service", partialMatch: false, pattern: "src/server/services/**" },
        { type: "infra", partialMatch: false, pattern: "src/server/infra/**" },
      ],
      // Resolucao de sessao (cookie -> userId). E um arquivo da camada de
      // controller que as paginas server-side tambem podem importar — SO ele.
      // Element casa pasta; arquivo individual e categoria de arquivo (#65,
      // item 19): qualquer outro arquivo que nascer em _shared continua sendo
      // `controller` puro, que a ui nao importa.
      "boundaries/files": [
        { category: "sessao", pattern: "src/app/api/v1/_shared/sessao.ts" },
        // O proxy do Next e um arquivo unico na raiz de src: `elements` casa
        // pasta, entao ele so pode ser descrito como categoria de arquivo.
        { category: "proxy", pattern: "src/proxy.ts" },
        // O vocabulario de erro da API e contrato dos DOIS lados: o controller
        // responde o codigo, a tela escolhe a frase. Por isso a ui importa este
        // arquivo, e so ele, do lado de controller — mesmo caso do sessao.ts.
        { category: "codigos-de-erro", pattern: "src/app/api/v1/_shared/erros.ts" },
      ],
    },
    rules: {
      // Todo arquivo em src/ tem que pertencer a uma camada. Arquivo solto quebra o lint
      // em vez de virar excecao silenciosa a arquitetura.
      "boundaries/no-unknown-files": "error",
      // Arquitetura em camadas: a dependencia so aponta para baixo.
      // Apresentacao -> Controllers -> Servicos -> Repositorios -> Infra/Dominio
      //
      // A ultima policy que casar e a que vale, entao a liberacao geral de pacotes
      // externos vem primeiro e os bloqueios pontuais vem no fim.
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          checkAllOrigins: true,
          message:
            "Camada '{{from.element.type}}' nao pode importar '{{to.element.type}}'.",
          policies: [
            {
              allow: { to: { module: { origin: "external" } } },
            },
            {
              // Builtin do Node ("node:crypto" no domain/senha, "node:*" em geral)
              // nao e pacote externo nem arquivo do projeto — liberar explicito.
              allow: { to: { module: { source: "node:*" } } },
            },
            {
              // A tela chama serviço direto. Server component que fizesse fetch no
              // próprio /api/v1 custaria uma segunda invocação de função por render.
              // O que continua barrado é o que importa: repositório, infra e Prisma.
              from: { element: { type: "ui" } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ["ui", "service", "domain", "i18n"] },
                  },
                },
              },
            },
            {
              // A unica coisa do lado de controller que a ui importa: sessao.ts.
              from: { element: { type: "ui" } },
              allow: { to: { file: { categories: "sessao" } } },
            },
            {
              from: { element: { type: "ui" } },
              allow: { to: { file: { categories: "codigos-de-erro" } } },
            },
            {
              from: { element: { type: "controller" } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ["controller", "service", "domain", "i18n"] },
                  },
                },
              },
            },
            {
              // sessao.ts abre o cookie e verifica o JWT: precisa da infra.
              from: { file: { categories: "sessao" } },
              allow: {
                to: { element: { types: { anyOf: ["infra", "domain"] } } },
              },
            },
            {
              from: { element: { type: "service" } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ["service", "repository", "infra", "domain"],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: "repository" } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ["repository", "infra", "domain", "prisma"],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: "infra" } },
              allow: {
                to: { element: { types: { anyOf: ["infra", "domain"] } } },
              },
            },
            {
              from: { element: { type: "domain" } },
              allow: { to: { element: { type: "domain" } } },
            },
            {
              from: { element: { type: "i18n" } },
              allow: { to: { element: { type: "i18n" } } },
            },
            {
              // O proxy so decide idioma e redireciona. Servico, repositorio e
              // tela ficam do outro lado da linha.
              from: { file: { categories: "proxy" } },
              allow: { to: { element: { type: "i18n" } } },
            },
            {
              // O `default: disallow` ja barraria, mas com mensagem generica: o
              // proxy nao tem element, entao `{{from.element.type}}` sai vazio.
              from: { file: { categories: "proxy" } },
              disallow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        "ui",
                        "controller",
                        "service",
                        "repository",
                        "infra",
                        "domain",
                        "prisma",
                      ],
                    },
                  },
                },
              },
              message:
                "O proxy so decide idioma e redireciona — nao importa '{{to.element.type}}'.",
            },
            {
              from: { element: { type: "!repository" } },
              disallow: {
                to: { module: { origin: "external", source: "@prisma/client" } },
              },
              message:
                "Somente src/server/repositories importa o Prisma Client.",
            },
            {
              from: {
                element: {
                  types: {
                    anyOf: ["service", "repository", "infra", "domain"],
                  },
                },
              },
              disallow: {
                to: [
                  {
                    module: {
                      origin: "external",
                      source: "next",
                      internalPath: "headers",
                    },
                  },
                  {
                    module: {
                      origin: "external",
                      source: "next",
                      internalPath: "server",
                    },
                  },
                ],
              },
              message:
                "Sessao, cookies e headers sao resolvidos no controller, nunca em '{{from.element.type}}'.",
            },
          ],
        },
      ],
    },
  },
  {
    // D8 da #116: texto de produto nao nasce solto no JSX, nasce no catalogo de
    // mensagens. Duas regras porque uma nao cobre o furo da outra.
    files: ["src/app/(ui)/**/*.tsx"],
    rules: {
      // 1. Texto entre tags. `ignoreProps` evita centenas de falsos positivos em
      //    className; as props que carregam texto ficam com a regra 2.
      "react/jsx-no-literals": [
        "error",
        {
          noStrings: true,
          ignoreProps: true,
          allowedStrings: [
            // Pontuacao e simbolo: nao sao frase, nao se traduzem.
            "·", "—", "–", "/", "%", "½", "+", "×", "♥", "←", "→", "✕", "●", "○",
            // Marca: o wordmark, o simbolo de nota e o 葉宙 do logo.
            "Folunio", "✦", "葉宙",
            // Rota tecnica exibida como o proprio texto do link.
            "/api/v1/health",
          ],
        },
      ],
      // 2. O furo da regra 1: prop que vira texto para quem le. Regex so nessas,
      //    entao className, href, type e id continuam passando.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name=/^(aria-label|aria-description|aria-placeholder|placeholder|title|alt)$/] > Literal[value!='']",
          message: "Texto em prop: use t() do next-intl.",
        },
        {
          selector:
            "JSXAttribute[name.name=/^(aria-label|aria-description|aria-placeholder|placeholder|title|alt)$/] > JSXExpressionContainer > Literal[value!='']",
          message: "Texto em prop: use t() do next-intl.",
        },
        {
          selector:
            "JSXAttribute[name.name=/^(aria-label|aria-description|aria-placeholder|placeholder|title|alt)$/] > JSXExpressionContainer > TemplateLiteral",
          message: "Texto em prop: use t() do next-intl, com interpolacao ICU.",
        },
      ],
    },
  },
  {
    // Servico e dominio nao conhecem HTTP. A regra de boundaries acima cobra o
    // import de `next/headers` e `next/server`; esta cobra os GLOBAIS do
    // runtime (`Request`, `Headers`, `Response`), que passavam sem import
    // (#65, item 18) — tanto como valor quanto como anotacao de tipo.
    files: ["src/server/services/**/*.ts", "src/server/domain/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "Request", message: "HTTP e coisa de controller — servico e dominio nao tocam Request." },
        { name: "Headers", message: "HTTP e coisa de controller — servico e dominio nao tocam Headers." },
        { name: "Response", message: "HTTP e coisa de controller — servico e dominio nao tocam Response." },
      ],
      "@typescript-eslint/no-restricted-types": [
        "error",
        {
          types: {
            Request: { message: "HTTP e coisa de controller — servico e dominio nao tocam Request." },
            Headers: { message: "HTTP e coisa de controller — servico e dominio nao tocam Headers." },
            Response: { message: "HTTP e coisa de controller — servico e dominio nao tocam Response." },
          },
        },
      ],
    },
  },
]);

export default eslintConfig;
