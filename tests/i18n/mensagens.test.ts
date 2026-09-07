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

const CAMINHOS_PT = caminhos(ptBR as Arvore);
const CAMINHOS_EN = caminhos(en as Arvore);

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

    // `{n}`, `{n, plural, ...}` — só o nome do argumento importa para a paridade.
    const argumentos = (mensagem: string) =>
      [...mensagem.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((m) => m[1]).sort();

    const divergentes = [...pt].filter(([caminho, valor]) => {
      const outro = emIngles.get(caminho);

      return (
        outro !== undefined &&
        argumentos(valor).join("|") !== argumentos(outro).join("|")
      );
    });

    expect(divergentes.map(([caminho]) => caminho)).toEqual([]);
  });
});
