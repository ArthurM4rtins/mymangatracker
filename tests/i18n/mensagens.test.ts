import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import ptBR from "../../messages/pt-BR.json";

type Arvore = { [chave: string]: string | Arvore };

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

/**
 * Os nomes de argumento de uma mensagem ICU, em ordem.
 *
 * Não dá para fazer isso com regex: em `{n, plural, =1 {curtida} other
 * {curtidas}}` as chaves de `{curtida}` são o corpo do ramo, não um argumento,
 * e uma regex de `{palavra}` conta as duas coisas igual. Então o texto é lido
 * de verdade — chave em posição de argumento é argumento, chave depois de um
 * seletor de plural abre corpo de mensagem, que pode ter argumentos dentro
 * (é o caso de `{n, plural, one {<forte>{valor}</forte> lista} ...}`).
 */
function argumentosIcu(mensagem: string): string[] {
  const nomes: string[] = [];

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
    nomes.push(mensagem.slice(i, fim));
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

    // `seletor {corpo}` até fechar o argumento.
    while (i < mensagem.length && mensagem[i] !== "}") {
      i = espacos(palavra(espacos(i)));

      if (mensagem[i] !== "{") return i;

      i = texto(i + 1) + 1;
      i = espacos(i);
    }

    return i + 1;
  }

  texto(0);

  return nomes.sort();
}

const CAMINHOS_PT = caminhos(ptBR as Arvore);
const CAMINHOS_EN = caminhos(en as Arvore);

describe("leitura de argumentos ICU", () => {
  it("acha o argumento simples", () => {
    expect(argumentosIcu("Nada encontrado para {termo}.")).toEqual(["termo"]);
  });

  it("não confunde corpo de ramo do plural com argumento", () => {
    expect(argumentosIcu("{n, plural, =1 {curtida} other {curtidas}}")).toEqual(["n"]);
    expect(argumentosIcu("{n, plural, one {like} other {likes}}")).toEqual(["n"]);
  });

  it("acha argumento dentro do ramo, junto da marcação", () => {
    expect(
      argumentosIcu("{n, plural, one {<forte>{valor}</forte> lista} other {<forte>{valor}</forte> listas}}"),
    ).toEqual(["n", "valor", "valor"]);
  });

  it("separa quem realmente diverge", () => {
    const pt = argumentosIcu("por <autor>{username}</autor> · {n, plural, =1 {# obra} other {# obras}}");
    const bom = argumentosIcu("by <autor>{username}</autor> · {n, plural, one {# obra} other {# obras}}");
    const ruim = argumentosIcu("by <autor>{user}</autor> · {n, plural, one {# obra} other {# obras}}");

    expect(bom).toEqual(pt);
    expect(ruim).not.toEqual(pt);
  });
});

describe("catálogos de mensagens", () => {
  it("tem pelo menos uma chave", () => {
    expect(CAMINHOS_PT.length).toBeGreaterThan(0);
  });

  it("não tem chave só no pt-BR", () => {
    const faltando = CAMINHOS_PT.filter((c) => !CAMINHOS_EN.includes(c));

    expect(faltando).toEqual([]);
  });

  it("não tem chave só no en", () => {
    const sobrando = CAMINHOS_EN.filter((c) => !CAMINHOS_PT.includes(c));

    expect(sobrando).toEqual([]);
  });

  it("não tem valor vazio", () => {
    const vazias = [...folhas(ptBR as Arvore), ...folhas(en as Arvore)]
      .filter(([, valor]) => valor.trim() === "")
      .map(([caminho]) => caminho);

    expect(vazias).toEqual([]);
  });

  it("mantém os mesmos argumentos ICU nos dois idiomas", () => {
    const pt = folhas(ptBR as Arvore);
    const emIngles = folhas(en as Arvore);

    const divergentes = [...pt].filter(([caminho, valor]) => {
      const outro = emIngles.get(caminho);

      return (
        outro !== undefined &&
        argumentosIcu(valor).join("|") !== argumentosIcu(outro).join("|")
      );
    });

    expect(divergentes.map(([caminho]) => caminho)).toEqual([]);
  });
});
