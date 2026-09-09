import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

// #181: `chrome.storage.local` e do NAVEGADOR, nao da conta. O popup ja tratava
// isso — so usa o par se o `entradaId` estiver na estante de quem esta logado —,
// mas o service worker acendia o badge so por o par existir. Duas contas no mesmo
// navegador e o badge prometia "da pra registrar aqui" numa pagina que o popup
// abriria sem obra selecionada.

type Kidoku = {
  donoDoToken: (token: string) => string | null;
  parDoDono: (
    pares: Record<string, unknown>,
    chave: string | null,
    dono: string | null,
  ) => string | null;
};

let KIDOKU: Kidoku;

// `comum.js` nao e modulo: e um script global que o popup carrega por <script>
// e o service worker por importScripts, e que atribui tudo a `globalThis.KIDOKU`.
// Importar nao funciona (o compilador recusa), entao ele e executado como o
// navegador executaria — assim o teste roda o arquivo DE VERDADE, e nao uma
// copia que pode divergir.
beforeAll(function ()
{
  const caminho = fileURLToPath(new URL("../../extension/comum.js", import.meta.url));
  new Function(readFileSync(caminho, "utf-8"))();
  KIDOKU = (globalThis as unknown as { KIDOKU: Kidoku }).KIDOKU;
});

/** Um JWT de mentira: so o payload importa, e ele nao e verificado aqui. */
function tokenCom(payload: Record<string, unknown>): string
{
  const base64url = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `cabecalho.${base64url}.assinatura`;
}

describe("donoDoToken", function ()
{
  it("tira o dono do payload do JWT", function ()
  {
    expect(KIDOKU.donoDoToken(tokenCom({ sub: "u1" }))).toBe("u1");
  });

  it("token torto nao explode: devolve null", function ()
  {
    expect(KIDOKU.donoDoToken("")).toBeNull();
    expect(KIDOKU.donoDoToken("uma-coisa-so")).toBeNull();
    expect(KIDOKU.donoDoToken("a.nao-e-base64-valido!.c")).toBeNull();
    expect(KIDOKU.donoDoToken(tokenCom({ semSub: true }))).toBeNull();
  });
});

describe("parDoDono", function ()
{
  const pares = {
    "mangadex.org#berserk": { entradaId: "e1", dono: "provadona" },
    "mangadex.org#vinland": { entradaId: "e2", dono: "roca" },
  };

  it("devolve o par quando ele e de quem esta logado", function ()
  {
    expect(KIDOKU.parDoDono(pares, "mangadex.org#berserk", "provadona")).toBe("e1");
  });

  it("par de OUTRA conta e como se nao existisse — o defeito da #181", function ()
  {
    expect(KIDOKU.parDoDono(pares, "mangadex.org#berserk", "roca")).toBeNull();
  });

  it("sem sessao, nada e de ninguem", function ()
  {
    expect(KIDOKU.parDoDono(pares, "mangadex.org#berserk", null)).toBeNull();
  });

  it("chave ausente ou nula devolve null", function ()
  {
    expect(KIDOKU.parDoDono(pares, "mangadex.org#nao-pareada", "provadona")).toBeNull();
    expect(KIDOKU.parDoDono(pares, null, "provadona")).toBeNull();
  });

  it("par no formato antigo, sem dono, nao vale para ninguem", function ()
  {
    // Guardado antes desta correcao: nao da para saber de quem e, e adivinhar
    // seria repetir o bug. Um clique no popup pareia de novo.
    expect(KIDOKU.parDoDono({ "x#y": "e9" }, "x#y", "provadona")).toBeNull();
  });
});
