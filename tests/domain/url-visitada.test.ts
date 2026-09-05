import { describe, expect, it } from "vitest";
import { normalizarUrlVisitada } from "@/server/domain/url-visitada";

// A extensão (issue #52) é o primeiro caso em que a URL gravada em
// `ReadingProgress.resolvedUrl` NÃO nasce no servidor: ela é a aba que o usuário
// está lendo. O app depois mostra essa URL como link do histórico, então o que
// entra aqui vira `href` mais tarde. Esquema fora de http(s) é recusado no
// domínio, não na tela: outro chamador não pode contornar.

const REAL = "https://mangafire.to/title/4mx-vagabondd/chapter/4745884";

describe("normalizarUrlVisitada", function ()
{
  it("aceita a URL de leitura como ela é", function ()
  {
    expect(normalizarUrlVisitada(REAL)).toBe(REAL);
  });

  it("aceita http, que ainda existe em site de scan", function ()
  {
    expect(normalizarUrlVisitada("http://site.com/ler/2")).toBe("http://site.com/ler/2");
  });

  it("preserva query e âncora, que em alguns sites levam o capítulo", function ()
  {
    expect(normalizarUrlVisitada("https://site.com/ler?cap=2#pagina-3"))
      .toBe("https://site.com/ler?cap=2#pagina-3");
  });

  it("ignora espaço em volta", function ()
  {
    expect(normalizarUrlVisitada(`  ${REAL}  `)).toBe(REAL);
  });

  it("recusa javascript:, que viraria XSS no link do histórico", function ()
  {
    expect(normalizarUrlVisitada("javascript:alert(1)")).toBeNull();
  });

  it("recusa data:", function ()
  {
    expect(normalizarUrlVisitada("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("recusa esquema da própria extensão e do disco", function ()
  {
    expect(normalizarUrlVisitada("chrome-extension://abcdef/popup.html")).toBeNull();
    expect(normalizarUrlVisitada("file:///C:/Users/leitor/capitulo.html")).toBeNull();
  });

  it("recusa URL com credencial embutida", function ()
  {
    // Iria parar no banco e no log em texto puro.
    expect(normalizarUrlVisitada("https://leitor:senha@site.com/ler/2")).toBeNull();
  });

  it("recusa URL relativa: sem host não dá para reabrir", function ()
  {
    expect(normalizarUrlVisitada("/title/x/chapter/2")).toBeNull();
  });

  it("recusa vazio", function ()
  {
    expect(normalizarUrlVisitada("")).toBeNull();
    expect(normalizarUrlVisitada("   ")).toBeNull();
  });

  it("recusa lixo que não é URL", function ()
  {
    expect(normalizarUrlVisitada("Vagabond - Chapter 2")).toBeNull();
  });

  it("recusa URL absurdamente longa", function ()
  {
    expect(normalizarUrlVisitada(`https://site.com/${"a".repeat(2048)}`)).toBeNull();
  });
});
