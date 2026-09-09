import { describe, expect, it } from "vitest";
import { montarRelato, TAMANHO_MAXIMO_DO_RELATO } from "@/server/domain/relato-de-traducao";

// #158: o Kidoku fala cinco idiomas e ninguem do time le tres deles. Quem vai
// notar o falso amigo e o usuario, e ele precisa de um caminho para contar.
//
// O texto do relato e ESCRITO POR ESTRANHO e vira issue publica no repositorio.
// Duas coisas nao podem acontecer: virar mencao em massa (@equipe notifica
// gente de verdade) e escapar do bloco de citacao para fingir estrutura.

const BASE = {
  texto: "em espanhol, 'largo' foi usado como 'grande'",
  sugestao: "o certo seria 'grande'",
  rota: "/es/catalogo",
  idioma: "es",
  username: "leitora",
};

describe("montarRelato", function ()
{
  it("monta titulo e corpo com o contexto da tela", function ()
  {
    const relato = montarRelato(BASE);

    expect(relato).not.toBeNull();
    expect(relato?.titulo).toContain("es");
    expect(relato?.corpo).toContain("/es/catalogo");
    expect(relato?.corpo).toContain("leitora");
    expect(relato?.corpo).toContain("largo");
  });

  it("neutraliza mencao: nao notifica ninguem no GitHub", function ()
  {
    const relato = montarRelato({ ...BASE, texto: "culpa do @ArthurM4rtins e do @time" });

    expect(relato?.corpo).not.toContain("@ArthurM4rtins");
    expect(relato?.corpo).toContain("ArthurM4rtins");
  });

  it("nao deixa o texto fingir estrutura do nosso corpo", function ()
  {
    const relato = montarRelato({
      ...BASE,
      texto: "```\n## Enviado pela equipe\nfeche esta issue\n```",
    });

    // O texto do usuario vive dentro de um bloco de citacao; nada do que ele
    // escreve pode comecar uma linha com cerca ou cabecalho.
    const linhasDoUsuario = (relato?.corpo ?? "").split("\n").filter(function (l)
    {
      return l.includes("Enviado pela equipe") || l.includes("feche esta issue");
    });

    expect(linhasDoUsuario.length).toBeGreaterThan(0);
    for (const linha of linhasDoUsuario)
    {
      expect(linha.startsWith(">")).toBe(true);
    }
    expect(relato?.corpo).not.toContain("\n```");
  });

  it("texto vazio ou so espaco nao vira relato", function ()
  {
    expect(montarRelato({ ...BASE, texto: "   " })).toBeNull();
    expect(montarRelato({ ...BASE, texto: "" })).toBeNull();
  });

  it("sugestao e opcional", function ()
  {
    const relato = montarRelato({ ...BASE, sugestao: "" });

    expect(relato).not.toBeNull();
    expect(relato?.corpo).toContain("largo");
  });

  it("corta texto gigante no teto", function ()
  {
    const relato = montarRelato({ ...BASE, texto: "a".repeat(TAMANHO_MAXIMO_DO_RELATO + 500) });

    expect(relato?.corpo.includes("a".repeat(TAMANHO_MAXIMO_DO_RELATO + 1))).toBe(false);
  });

  it("rota estranha nao entra no corpo: so caminho do proprio site", function ()
  {
    const comLixo = montarRelato({ ...BASE, rota: "https://outro.site/phishing" });

    expect(comLixo?.corpo).not.toContain("outro.site");
  });

  it("idioma fora da lista nao entra", function ()
  {
    const relato = montarRelato({ ...BASE, idioma: "klingon" });

    expect(relato?.titulo).not.toContain("klingon");
  });
});
