import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

// #181: `chrome.storage.local` e do NAVEGADOR, nao da conta. O popup ja tratava
// isso — so usa o par se o `entradaId` estiver na estante de quem esta logado —,
// mas o service worker acendia o badge so por o par existir. Duas contas no mesmo
// navegador e o badge prometia "da pra registrar aqui" numa pagina que o popup
// abriria sem obra selecionada.

type Folunio = {
  donoDoToken: (token: string) => string | null;
  parDoDono: (
    pares: Record<string, unknown>,
    chave: string | null,
    dono: string | null,
  ) => string | null;
  deveParear: (status: number) => boolean;
};

let FOLUNIO: Folunio;

// `comum.js` nao e modulo: e um script global que o popup carrega por <script>
// e o service worker por importScripts, e que atribui tudo a `globalThis.FOLUNIO`.
// Importar nao funciona (o compilador recusa), entao ele e executado como o
// navegador executaria — assim o teste roda o arquivo DE VERDADE, e nao uma
// copia que pode divergir.
beforeAll(function ()
{
  const caminho = fileURLToPath(new URL("../../extension/comum.js", import.meta.url));
  new Function(readFileSync(caminho, "utf-8"))();
  FOLUNIO = (globalThis as unknown as { FOLUNIO: Folunio }).FOLUNIO;
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
    expect(FOLUNIO.donoDoToken(tokenCom({ sub: "u1" }))).toBe("u1");
  });

  it("token torto nao explode: devolve null", function ()
  {
    expect(FOLUNIO.donoDoToken("")).toBeNull();
    expect(FOLUNIO.donoDoToken("uma-coisa-so")).toBeNull();
    expect(FOLUNIO.donoDoToken("a.nao-e-base64-valido!.c")).toBeNull();
    expect(FOLUNIO.donoDoToken(tokenCom({ semSub: true }))).toBeNull();
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
    expect(FOLUNIO.parDoDono(pares, "mangadex.org#berserk", "provadona")).toBe("e1");
  });

  it("par de OUTRA conta e como se nao existisse — o defeito da #181", function ()
  {
    expect(FOLUNIO.parDoDono(pares, "mangadex.org#berserk", "roca")).toBeNull();
  });

  it("sem sessao, nada e de ninguem", function ()
  {
    expect(FOLUNIO.parDoDono(pares, "mangadex.org#berserk", null)).toBeNull();
  });

  it("chave ausente ou nula devolve null", function ()
  {
    expect(FOLUNIO.parDoDono(pares, "mangadex.org#nao-pareada", "provadona")).toBeNull();
    expect(FOLUNIO.parDoDono(pares, null, "provadona")).toBeNull();
  });

  it("par no formato antigo, sem dono, nao vale para ninguem", function ()
  {
    // Guardado antes desta correcao: nao da para saber de quem e, e adivinhar
    // seria repetir o bug. Um clique no popup pareia de novo.
    expect(FOLUNIO.parDoDono({ "x#y": "e9" }, "x#y", "provadona")).toBeNull();
  });
});

// O par site→obra e' informacao de PAREAMENTO, nao de progresso: dizer "esta
// pagina e' esta obra" continua verdade mesmo quando o capitulo nao avanca. O
// popup so pareava com `resposta.ok`, e o 409 do `nao_avanca` caia fora — entao
// obra ja lida alem daquele capitulo nunca pareava, e o badge nunca acendia
// naquele site. Era o caso de quem reabre um capitulo antigo para reler.
describe("deveParear", function ()
{
  it("pareia quando o servidor registrou", function ()
  {
    expect(FOLUNIO.deveParear(200)).toBe(true);
  });

  it("pareia tambem quando o capitulo nao avanca: a obra foi reconhecida", function ()
  {
    expect(FOLUNIO.deveParear(409)).toBe(true);
  });

  it("nao pareia com pedido recusado, sessao morta nem falha do servidor", function ()
  {
    for (const status of [400, 401, 404, 422, 429, 500, 503])
    {
      expect(FOLUNIO.deveParear(status)).toBe(false);
    }
  });
});
