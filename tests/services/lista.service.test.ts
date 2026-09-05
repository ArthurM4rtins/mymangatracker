import { describe, expect, it, vi } from "vitest";
import {
  alternarObraNaLista,
  removerObraDaLista,
  criarListaDoUsuario,
} from "@/server/services/lista.service";

// As regras da issue #41: nome 1–100 após trim; alternar adiciona ou remove
// (toggle) na lista DO DONO; obra fora do cache não entra em lista.

describe("criarListaDoUsuario", function ()
{
  it("cria com nome aparado e descrição em branco virando null", async function ()
  {
    const criar = vi.fn(async function () { return { id: "l1" }; });

    const resultado = await criarListaDoUsuario(
      { userId: "u1", nome: "  isekai de qualidade  ", descricao: "   " },
      { criar },
    );

    expect(criar).toHaveBeenCalledWith({
      userId: "u1",
      nome: "isekai de qualidade",
      descricao: null,
    });
    expect(resultado).toEqual({ estado: "ok", listaId: "l1" });
  });

  it("nome vazio ou acima de 100 é inválido, sem tocar o banco", async function ()
  {
    const criar = vi.fn();

    await expect(
      criarListaDoUsuario({ userId: "u1", nome: "   ", descricao: null }, { criar }),
    ).resolves.toEqual({ estado: "lista_invalida" });
    await expect(
      criarListaDoUsuario(
        { userId: "u1", nome: "x".repeat(101), descricao: null },
        { criar },
      ),
    ).resolves.toEqual({ estado: "lista_invalida" });
    expect(criar).not.toHaveBeenCalled();
  });
});

describe("alternarObraNaLista", function ()
{
  function fakeDeps(cenario: {
    media?: { id: string } | null;
    adicionar?: { jaExistia: boolean } | null;
  })
  {
    const buscarMedia = vi.fn(async function ()
    {
      return cenario.media === undefined ? { id: "m1", syncedAt: new Date() } : cenario.media;
    });
    const adicionar = vi.fn(async function ()
    {
      return cenario.adicionar === undefined ? { jaExistia: false } : cenario.adicionar;
    });
    const remover = vi.fn(async function (): Promise<{ removido: true } | null>
    {
      return { removido: true };
    });

    return { deps: { buscarMedia, adicionar, remover }, buscarMedia, adicionar, remover };
  }

  it("obra fora da lista entra", async function ()
  {
    const { deps, adicionar, remover } = fakeDeps({});

    const resultado = await alternarObraNaLista(
      { userId: "u1", listaId: "l1", anilistId: 30013 },
      deps,
    );

    expect(adicionar).toHaveBeenCalledWith("u1", "l1", "m1");
    expect(remover).not.toHaveBeenCalled();
    expect(resultado).toEqual({ estado: "ok", contem: true });
  });

  it("obra que já estava sai — toggle", async function ()
  {
    const { deps, remover } = fakeDeps({ adicionar: { jaExistia: true } });

    const resultado = await alternarObraNaLista(
      { userId: "u1", listaId: "l1", anilistId: 30013 },
      deps,
    );

    expect(remover).toHaveBeenCalledWith("u1", "l1", "m1");
    expect(resultado).toEqual({ estado: "ok", contem: false });
  });

  it("obra fora do cache é obra_desconhecida", async function ()
  {
    const { deps, adicionar } = fakeDeps({ media: null });

    const resultado = await alternarObraNaLista(
      { userId: "u1", listaId: "l1", anilistId: 999 },
      deps,
    );

    expect(resultado).toEqual({ estado: "obra_desconhecida" });
    expect(adicionar).not.toHaveBeenCalled();
  });

  it("lista alheia ou inexistente é nao_encontrada", async function ()
  {
    const { deps } = fakeDeps({ adicionar: null });

    const resultado = await alternarObraNaLista(
      { userId: "u1", listaId: "alheia", anilistId: 30013 },
      deps,
    );

    expect(resultado).toEqual({ estado: "nao_encontrada" });
  });
});

// #65, item 9: o botão "remover" da página da lista chamava o TOGGLE — numa
// página desatualizada ele ADICIONAVA a obra. Remover é um verbo próprio.
describe("removerObraDaLista", function ()
{
  function fakeDeps(cenario: {
    media?: { id: string } | null;
    remover?: { removido: true } | null;
  })
  {
    const buscarMedia = vi.fn(async function ()
    {
      return cenario.media === undefined ? { id: "m1" } : cenario.media;
    });
    const remover = vi.fn(async function ()
    {
      return cenario.remover === undefined ? { removido: true as const } : cenario.remover;
    });

    return { deps: { buscarMedia, remover }, buscarMedia, remover };
  }

  it("remove a obra da lista do dono", async function ()
  {
    const { deps, remover } = fakeDeps({});

    const resultado = await removerObraDaLista(
      { userId: "u1", listaId: "l1", anilistId: 30656 },
      deps,
    );

    expect(resultado).toEqual({ estado: "ok" });
    expect(remover).toHaveBeenCalledWith("u1", "l1", "m1");
  });

  it("lista alheia, inexistente ou obra já fora é nao_encontrada — nunca adiciona", async function ()
  {
    const { deps } = fakeDeps({ remover: null });

    const resultado = await removerObraDaLista(
      { userId: "u1", listaId: "l1", anilistId: 30656 },
      deps,
    );

    expect(resultado).toEqual({ estado: "nao_encontrada" });
  });

  it("obra fora do cache é obra_desconhecida, sem tocar a lista", async function ()
  {
    const { deps, remover } = fakeDeps({ media: null });

    const resultado = await removerObraDaLista(
      { userId: "u1", listaId: "l1", anilistId: 30656 },
      deps,
    );

    expect(resultado).toEqual({ estado: "obra_desconhecida" });
    expect(remover).not.toHaveBeenCalled();
  });
});
