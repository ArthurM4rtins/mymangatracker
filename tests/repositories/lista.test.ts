import { beforeEach, describe, expect, it } from "vitest";
import { salvarMediaDoAniList } from "@/server/repositories/media.repository";
import {
  adicionarItem,
  apagarLista,
  buscarListaComItens,
  criarLista,
  listarListasPublicas,
  listarMinhasListas,
  removerItem,
} from "@/server/repositories/lista.repository";
import { limparBanco, semearUsuario } from "./apoio";

// As regras da issue #41: leitura pública sem vazar e-mail/ids; escrita só do
// dono; uma obra por lista; ordem de inserção.

const OBRA = {
  anilistId: 30013,
  type: "MANGA" as const,
  titleRomaji: "Vinland Saga",
  chapters: 224,
};

const OUTRA = {
  anilistId: 30002,
  type: "MANGA" as const,
  titleRomaji: "Berserk",
  chapters: 380,
};

beforeEach(limparBanco);

describe("listas públicas", function ()
{
  it("qualquer um lê, com username e sem e-mail nem ids de usuário", async function ()
  {
    const dono = await semearUsuario("dono");
    const media = await salvarMediaDoAniList(OBRA, new Date());
    const lista = await criarLista({ userId: dono.id, nome: "clássicos", descricao: null });
    await adicionarItem(dono.id, lista.id, media.id);

    const publicas = await listarListasPublicas(10);
    expect(publicas).toHaveLength(1);
    expect(publicas[0]).toMatchObject({
      nome: "clássicos",
      username: "dono",
      totalDeObras: 1,
    });

    const detalhe = await buscarListaComItens(lista.id, null);
    expect(detalhe?.itens.map(function (i) { return i.titleRomaji; })).toEqual([
      "Vinland Saga",
    ]);
    expect(JSON.stringify([publicas, detalhe])).not.toContain("@exemplo.test");
    expect(JSON.stringify([publicas, detalhe])).not.toContain(dono.id);
  });

  it("itens saem na ordem de inserção", async function ()
  {
    const dono = await semearUsuario("dono");
    const m1 = await salvarMediaDoAniList(OBRA, new Date());
    const m2 = await salvarMediaDoAniList(OUTRA, new Date());
    const lista = await criarLista({ userId: dono.id, nome: "ordem", descricao: null });
    await adicionarItem(dono.id, lista.id, m2.id);
    await adicionarItem(dono.id, lista.id, m1.id);

    const detalhe = await buscarListaComItens(lista.id, dono.id);
    expect(detalhe?.minha).toBe(true);
    expect(detalhe?.itens.map(function (i) { return i.anilistId; })).toEqual([
      30002, 30013,
    ]);
  });
});

describe("escrita só do dono", function ()
{
  it("intruso não adiciona, não remove e não apaga", async function ()
  {
    const dono = await semearUsuario("dono");
    const intruso = await semearUsuario("intruso");
    const media = await salvarMediaDoAniList(OBRA, new Date());
    const lista = await criarLista({ userId: dono.id, nome: "minha", descricao: null });
    await adicionarItem(dono.id, lista.id, media.id);

    await expect(adicionarItem(intruso.id, lista.id, media.id)).resolves.toBeNull();
    await expect(removerItem(intruso.id, lista.id, media.id)).resolves.toBeNull();
    await expect(apagarLista(intruso.id, lista.id)).resolves.toBeNull();

    await expect(buscarListaComItens(lista.id, null)).resolves.not.toBeNull();
  });

  it("obra repetida não duplica; remover e apagar funcionam para o dono", async function ()
  {
    const dono = await semearUsuario("dono");
    const media = await salvarMediaDoAniList(OBRA, new Date());
    const lista = await criarLista({ userId: dono.id, nome: "minha", descricao: null });

    await expect(adicionarItem(dono.id, lista.id, media.id)).resolves.toEqual({
      jaExistia: false,
    });
    await expect(adicionarItem(dono.id, lista.id, media.id)).resolves.toEqual({
      jaExistia: true,
    });

    await expect(removerItem(dono.id, lista.id, media.id)).resolves.toEqual({
      removido: true,
    });
    await expect(apagarLista(dono.id, lista.id)).resolves.toEqual({ removida: true });
    await expect(buscarListaComItens(lista.id, null)).resolves.toBeNull();
  });
});

describe("listarMinhasListas", function ()
{
  it("só as do usuário, com o jaContem da obra pedida", async function ()
  {
    const dono = await semearUsuario("dono");
    const outro = await semearUsuario("outro");
    const media = await salvarMediaDoAniList(OBRA, new Date());
    const lista = await criarLista({ userId: dono.id, nome: "com a obra", descricao: null });
    await criarLista({ userId: dono.id, nome: "sem a obra", descricao: null });
    await criarLista({ userId: outro.id, nome: "de outro", descricao: null });
    await adicionarItem(dono.id, lista.id, media.id);

    const minhas = await listarMinhasListas(dono.id, media.id);

    expect(minhas).toHaveLength(2);
    expect(minhas.find(function (l) { return l.nome === "com a obra"; })?.jaContem).toBe(true);
    expect(minhas.find(function (l) { return l.nome === "sem a obra"; })?.jaContem).toBe(false);
  });
});
