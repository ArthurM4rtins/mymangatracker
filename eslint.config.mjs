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
                    types: { anyOf: ["ui", "service", "domain"] },
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
              from: { element: { type: "controller" } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ["controller", "service", "domain"] },
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
