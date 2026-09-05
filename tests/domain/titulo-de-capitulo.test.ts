import { describe, expect, it } from "vitest";
import { capituloDoTitulo } from "@/server/domain/titulo-de-capitulo";

// A extensão (issue #52) lê o `document.title` da aba e nada mais: nem DOM, nem
// seletor, nem requisição ao site. Os dois casos que pareciam impossíveis pela
// URL — MangaFire e MangaDex — entregam o capítulo no título, e é daí que ele
// sai. Título que não diz o capítulo é `null`: o popup mostra o campo vazio para
// o usuário digitar, nunca um chute.

describe("capituloDoTitulo", function ()
{
  it("lê o título do MangaFire", function ()
  {
    expect(capituloDoTitulo("Vagabond - Chapter 2")).toBe(2);
  });

  it("lê o título do MangaDex sem confundir com o número da página", function ()
  {
    // "1 |" é a página aberta, não o capítulo. Errar aqui grava progresso errado.
    expect(capituloDoTitulo("1 | Chapter 2 - Vagabond - MangaDex")).toBe(2);
  });

  it("não confunde o volume com o capítulo", function ()
  {
    expect(capituloDoTitulo("Vagabond Vol. 1 Chapter 2")).toBe(2);
  });

  it("aceita meio capítulo", function ()
  {
    expect(capituloDoTitulo("Vagabond - Chapter 57.5")).toBe(57.5);
  });

  it("aceita decimal com vírgula, como escrevem os sites em português", function ()
  {
    expect(capituloDoTitulo("Vagabond - Capítulo 57,5")).toBe(57.5);
  });

  it("entende os marcadores em português", function ()
  {
    expect(capituloDoTitulo("Vagabond - Capítulo 57")).toBe(57);
    expect(capituloDoTitulo("Vagabond - Capitulo 57")).toBe(57);
    expect(capituloDoTitulo("Vagabond - Cap. 57")).toBe(57);
  });

  it("entende as abreviações em inglês", function ()
  {
    expect(capituloDoTitulo("Vagabond - Ch. 2")).toBe(2);
    expect(capituloDoTitulo("Vagabond chap 2")).toBe(2);
  });

  it("ignora a caixa das letras", function ()
  {
    expect(capituloDoTitulo("VAGABOND - CHAPTER 2")).toBe(2);
  });

  it("título ainda carregando é ausência de capítulo", function ()
  {
    // SPA: logo depois da navegação o título é só o host.
    expect(capituloDoTitulo("mangafire.to")).toBeNull();
    expect(capituloDoTitulo("mangadex.org")).toBeNull();
  });

  it("título vazio é ausência de capítulo", function ()
  {
    expect(capituloDoTitulo("")).toBeNull();
    expect(capituloDoTitulo("   ")).toBeNull();
  });

  it("marcador sem número é ausência de capítulo", function ()
  {
    expect(capituloDoTitulo("Vagabond - Chapter")).toBeNull();
  });

  it("número solto sem marcador não vira capítulo", function ()
  {
    // "Vagabond 2" pode ser temporada, volume, parte. Chutar aqui grava errado.
    expect(capituloDoTitulo("Vagabond 2")).toBeNull();
  });

  it("capítulo zero não existe no contrato", function ()
  {
    expect(capituloDoTitulo("Vagabond - Chapter 0")).toBeNull();
  });

  it("recusa capítulo acima do que a coluna aceita", function ()
  {
    // ReadingProgress.chapter é Decimal(8,2): 999999.99 é o teto.
    expect(capituloDoTitulo("Vagabond - Chapter 1000000")).toBeNull();
  });

  it("arredonda para as duas casas que a coluna guarda", function ()
  {
    expect(capituloDoTitulo("Vagabond - Chapter 57.567")).toBe(57.57);
  });
});
