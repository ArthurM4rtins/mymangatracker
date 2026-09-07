import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { PLURAL_DOBRADO_EM_OUTRO, routing } from "@/i18n/routing";

type Arvore = { [chave: string]: string | Arvore };

/**
 * O idioma de referência: é dele que saem os tipos das chaves (`Messages` em
 * `src/i18n/mensagens.d.ts`), então é contra ele que todos os outros batem.
 */
const REFERENCIA = "pt-BR";

/**
 * Os catálogos saem de `routing.locales`, não de import fixo. É isso que faz um
 * idioma novo nascer coberto: acrescentar `"es"` ao routing já põe `es.json` sob
 * todas as regras abaixo, sem tocar neste arquivo.
 */
function catalogo(idioma: string): Arvore {
  return JSON.parse(readFileSync(`messages/${idioma}.json`, "utf8")) as Arvore;
}

const CATALOGOS = routing.locales.map((idioma) => [idioma, catalogo(idioma)] as const);
const OUTROS = CATALOGOS.filter(([idioma]) => idioma !== REFERENCIA);

/** Todo caminho folha da árvore, em ordem, como "estante.status.READING". */
function caminhos(arvore: Arvore, prefixo = ""): string[] {
  return Object.entries(arvore).flatMap(([chave, valor]) => {
    const caminho = prefixo === "" ? chave : `${prefixo}.${chave}`;

    return typeof valor === "string" ? [caminho] : caminhos(valor, caminho);
  });
}

/** Os valores de cada folha, indexados pelo caminho. */
function folhas(arvore: Arvore, prefixo = ""): Map<string, string> {
  const mapa = new Map<string, string>();

  for (const [chave, valor] of Object.entries(arvore)) {
    const caminho = prefixo === "" ? chave : `${prefixo}.${chave}`;

    if (typeof valor === "string") {
      mapa.set(caminho, valor);
    } else {
      for (const [subCaminho, subValor] of folhas(valor, caminho)) {
        mapa.set(subCaminho, subValor);
      }
    }
  }

  return mapa;
}

type Plural = {
  /** Categorias do CLDR usadas: `one`, `few`, `other`… */
  categorias: string[];
  /** Formas exatas usadas: `=0`, `=1`. Cobrem um número, não uma categoria. */
  exatas: string[];
};

type LeituraIcu = {
  argumentos: string[];
  plurais: Plural[];
};

/**
 * Lê uma mensagem ICU de verdade, em vez de regex.
 *
 * Regex não serve: em `{n, plural, =1 {curtida} other {curtidas}}` as chaves de
 * `{curtida}` são o corpo do ramo, não um argumento, e `{palavra}` é igual nos
 * dois casos. Então o texto é percorrido sabendo em que posição está — chave em
 * posição de argumento é argumento, chave depois de um seletor abre corpo de
 * mensagem, que pode ter argumento dentro (é o caso de
 * `{n, plural, one {<forte>{valor}</forte> lista} …}`).
 */
function lerIcu(mensagem: string): LeituraIcu {
  const argumentos: string[] = [];
  const plurais: Plural[] = [];

  const espacos = (i: number) => {
    while (i < mensagem.length && /\s/.test(mensagem[i])) i += 1;
    return i;
  };

  const palavra = (i: number) => {
    let fim = i;
    while (fim < mensagem.length && /[^\s,{}]/.test(mensagem[fim])) fim += 1;
    return fim;
  };

  /** Corpo de mensagem: `{` aqui abre um argumento. Para no `}` que o fecha. */
  function texto(i: number): number {
    while (i < mensagem.length) {
      if (mensagem[i] === "}") return i;
      if (mensagem[i] === "{") i = argumento(i + 1);
      else i += 1;
    }
    return i;
  }

  /** Já dentro de `{`: lê o nome e, se houver, o tipo e as opções. */
  function argumento(i: number): number {
    i = espacos(i);
    const fim = palavra(i);
    argumentos.push(mensagem.slice(i, fim));
    i = espacos(fim);

    if (mensagem[i] !== ",") return i + 1;

    i = espacos(i + 1);
    const fimDoTipo = palavra(i);
    const tipo = mensagem.slice(i, fimDoTipo);
    i = espacos(fimDoTipo);

    if (mensagem[i] !== ",") return i + 1;

    i = espacos(i + 1);

    if (tipo !== "plural" && tipo !== "select" && tipo !== "selectordinal") {
      // Estilo simples (`{quando, date, short}`): segue até fechar.
      while (i < mensagem.length && mensagem[i] !== "}") i += 1;
      return i + 1;
    }

    const seletores: string[] = [];

    // `seletor {corpo}` até fechar o argumento.
    while (i < mensagem.length && mensagem[i] !== "}") {
      i = espacos(i);
      const fimDoSeletor = palavra(i);
      seletores.push(mensagem.slice(i, fimDoSeletor));
      i = espacos(fimDoSeletor);

      if (mensagem[i] !== "{") return i;

      i = espacos(texto(i + 1) + 1);
    }

    if (tipo !== "select") {
      plurais.push({
        categorias: seletores.filter((s) => !s.startsWith("=")),
        exatas: seletores.filter((s) => s.startsWith("=")),
      });
    }

    return i + 1;
  }

  texto(0);

  return { argumentos: argumentos.sort(), plurais };
}

describe("leitura de mensagem ICU", () => {
  it("acha o argumento simples", () => {
    expect(lerIcu("Nada encontrado para {termo}.").argumentos).toEqual(["termo"]);
  });

  it("não confunde corpo de ramo do plural com argumento", () => {
    expect(lerIcu("{n, plural, =1 {curtida} other {curtidas}}").argumentos).toEqual(["n"]);
    expect(lerIcu("{n, plural, one {like} other {likes}}").argumentos).toEqual(["n"]);
  });

  it("acha argumento dentro do ramo, junto da marcação", () => {
    expect(
      lerIcu("{n, plural, one {<forte>{valor}</forte> lista} other {<forte>{valor}</forte> listas}}")
        .argumentos,
    ).toEqual(["n", "valor", "valor"]);
  });

  it("separa categoria de plural de forma exata", () => {
    const { plurais } = lerIcu("{n, plural, =0 {nada} one {uma} other {várias}}");

    expect(plurais).toEqual([{ categorias: ["one", "other"], exatas: ["=0"] }]);
  });

  it("separa quem realmente diverge", () => {
    const args = (m: string) => lerIcu(m).argumentos.join("|");
    const pt = args("por <autor>{username}</autor> · {n, plural, =1 {# obra} other {# obras}}");

    expect(args("by <autor>{username}</autor> · {n, plural, one {# obra} other {# obras}}")).toBe(pt);
    expect(args("by <autor>{user}</autor> · {n, plural, one {# obra} other {# obras}}")).not.toBe(pt);
  });
});

describe("catálogos de mensagens", () => {
  const referencia = catalogo(REFERENCIA);
  const CAMINHOS_REFERENCIA = caminhos(referencia);

  it("tem um arquivo para cada idioma do routing", () => {
    expect(CATALOGOS.length).toBe(routing.locales.length);
  });

  it("tem pelo menos uma chave", () => {
    expect(CAMINHOS_REFERENCIA.length).toBeGreaterThan(0);
  });

  it.each(OUTROS)("não deixa chave sem tradução em %s", (_idioma, arvore) => {
    const faltando = CAMINHOS_REFERENCIA.filter((c) => !caminhos(arvore).includes(c));

    expect(faltando).toEqual([]);
  });

  it.each(OUTROS)("não guarda chave que o %s inventou", (_idioma, arvore) => {
    const sobrando = caminhos(arvore).filter((c) => !CAMINHOS_REFERENCIA.includes(c));

    expect(sobrando).toEqual([]);
  });

  /**
   * Um catálogo copiado do português e não traduzido passa em TODAS as outras
   * regras desta suíte: mesma árvore, mesmos argumentos, mesmos plurais. Foi o
   * que aconteceu ao acrescentar o espanhol e de novo ao acrescentar o francês.
   *
   * Alguma coincidência é legítima — nome de formato, marca, palavra que os dois
   * idiomas escrevem igual. Medido nas traduções de verdade: inglês repete 4% do
   * português, espanhol 19%. O corte fica em 50%, longe dos dois e longe da
   * cópia, que é 100%.
   */
  it.each(OUTROS)("não é o português copiado, em %s", (_idioma, arvore) => {
    const daReferencia = folhas(referencia);
    const traduzidas = folhas(arvore);

    const iguais = [...daReferencia].filter(
      ([caminho, valor]) => traduzidas.get(caminho) === valor,
    );

    const proporcao = iguais.length / daReferencia.size;

    expect(proporcao).toBeLessThan(0.5);
  });

  it.each(CATALOGOS)("não tem valor vazio em %s", (_idioma, arvore) => {
    const vazias = [...folhas(arvore)]
      .filter(([, valor]) => valor.trim() === "")
      .map(([caminho]) => caminho);

    expect(vazias).toEqual([]);
  });

  it.each(OUTROS)("mantém os argumentos ICU da referência em %s", (_idioma, arvore) => {
    const daReferencia = folhas(referencia);
    const traduzidas = folhas(arvore);

    const divergentes = [...daReferencia].filter(([caminho, valor]) => {
      const outro = traduzidas.get(caminho);

      // Conjunto, não contagem: usar `{n}` uma vez ou três é escolha de quem
      // escreve a frase. O que quebra a tela é argumento com nome diferente,
      // ou que sumiu.
      const nomes = (mensagem: string) => [...new Set(lerIcu(mensagem).argumentos)].join("|");

      return outro !== undefined && nomes(valor) !== nomes(outro);
    });

    expect(divergentes.map(([caminho]) => caminho)).toEqual([]);
  });

  /**
   * O erro que mata idioma novo: copiar a forma `one`/`other` do inglês para uma
   * língua que precisa de mais. Russo precisa de `one`/`few`/`many`/`other`,
   * árabe de seis, japonês só de `other`. Sem esta regra, um `ru.json` com duas
   * formas passa no CI inteiro e renderiza errado para 2, 3, 4, 5…
   *
   * Só `other` é permitido e significa "a palavra não varia" — é o caso de
   * "seguindo"/"following". O que a regra proíbe é a especificação PELA METADE:
   * declarar `one` e parar, deixando `other` engolir formas que a língua
   * distingue. Não declarar nada e declarar tudo são decisões; declarar metade
   * é o descuido.
   */
  it.each(CATALOGOS)("declara as formas de plural que o %s exige", (idioma, arvore) => {
    const exigidas = new Intl.PluralRules(idioma).resolvedOptions().pluralCategories;
    const dobradas: readonly string[] = PLURAL_DOBRADO_EM_OUTRO[idioma] ?? [];
    const precisa = exigidas.filter((categoria) => !dobradas.includes(categoria));

    const regras = new Intl.PluralRules(idioma);

    const incompletas = [...folhas(arvore)].flatMap(([caminho, valor]) =>
      lerIcu(valor).plurais.flatMap((plural) => {
        // Só `other` e mais nada: a palavra não varia. Ter uma forma exata junto
        // (`=1 {…} other {…}`) prova que ela varia, e aí a regra volta a valer —
        // era por aqui que os plurais do próprio pt-BR escapavam sem conferência.
        const invariavel =
          plural.exatas.length === 0 &&
          plural.categorias.length === 1 &&
          plural.categorias[0] === "other";

        if (invariavel) {
          return [];
        }

        // `=1` cobre a categoria em que o número 1 cai naquele idioma. É por isso
        // que `=1 {# obra} other {# obras}` está correto em português: `=1` faz o
        // trabalho de `one`. Quem decide isso é o CLDR, não o palpite de quem lê.
        const cobertas = new Set(plural.categorias);

        for (const exata of plural.exatas) {
          const numero = Number(exata.slice(1));

          if (Number.isFinite(numero)) {
            cobertas.add(regras.select(numero));
          }
        }

        const faltando = precisa.filter((categoria) => !cobertas.has(categoria));

        return faltando.length === 0
          ? []
          : [`${caminho}: cobre [${[...cobertas].sort().join(", ")}], falta [${faltando.join(", ")}]`];
      }),
    );

    expect(incompletas).toEqual([]);
  });

  it.each(CATALOGOS)("não usa forma de plural que não existe em %s", (idioma, arvore) => {
    const validas = new Intl.PluralRules(idioma).resolvedOptions().pluralCategories;

    const invalidas = [...folhas(arvore)].flatMap(([caminho, valor]) =>
      lerIcu(valor)
        .plurais.flatMap((plural) => plural.categorias)
        .filter((categoria) => !validas.includes(categoria as Intl.LDMLPluralRule))
        .map((categoria) => `${caminho}: ${categoria}`),
    );

    expect(invalidas).toEqual([]);
  });
});
