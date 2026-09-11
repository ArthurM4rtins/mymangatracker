import { describe, expect, it, vi } from "vitest";
import type { Veredito } from "@/server/domain/limite-de-tentativas";

// Teto de listas por usuario (#136); livre por padrao, bloqueado so no caso que o pede.
const limitar = vi.fn(async function (): Promise<Veredito> { return { bloqueado: false }; });
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import type { ResultadoDaFonte } from "@/server/services/obra-externa.service";
import {
  adicionarObraNaLista,
  removerObraDaLista,
  criarListaDoUsuario,
} from "@/server/services/lista.service";

// As regras da issue #41: nome 1–100 após trim; adicionar e remover são verbos
// próprios na lista DO DONO (#237 — o toggle saiu).

describe("criarListaDoUsuario", function ()
{
  it("acima do teto por usuario nao cria e diz quanto esperar (#136)", async function ()
  {
    const criar = vi.fn(async function () { return { id: "l1" }; });
    limitar.mockResolvedValueOnce({ bloqueado: true, esperarSegundos: 90 });

    await expect(criarListaDoUsuario({ userId: "u1", nome: "isekai", descricao: null }, { criar, limitar }))
      .resolves.toEqual({ estado: "limitado", esperarSegundos: 90 });
    expect(criar).not.toHaveBeenCalled();
  });

  it("cria com nome aparado e descrição em branco virando null", async function ()
  {
    const criar = vi.fn(async function () { return { id: "l1" }; });

    const resultado = await criarListaDoUsuario(
      { userId: "u1", nome: "  isekai de qualidade  ", descricao: "   " },
      { criar, limitar },
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
      criarListaDoUsuario({ userId: "u1", nome: "   ", descricao: null }, { criar, limitar }),
    ).resolves.toEqual({ estado: "lista_invalida" });
    await expect(
      criarListaDoUsuario(
        { userId: "u1", nome: "x".repeat(101), descricao: null },
        { criar, limitar },
      ),
    ).resolves.toEqual({ estado: "lista_invalida" });
    expect(criar).not.toHaveBeenCalled();
  });
});

// #237: adicionar é um verbo próprio, idempotente — não é mais toggle. A obra
// não precisa estar na estante nem no cache: fora do cache, vem do AniList
// (Kitsu como degrau de baixo, #219) e é cacheada, como na estante.
describe("adicionarObraNaLista", function ()
{
  const OBRA: MediaDoAniList = { anilistId: 30013, type: "MANGA", titleRomaji: "One Piece" };

  function fakeDeps(cenario: {
    media?: { id: string } | null;
    aniList?: MediaDoAniList | null | Error;
    kitsu?: MediaDoAniList | null | Error;
    adicionar?: { jaExistia: boolean } | { cheia: true } | null;
  })
  {
    const buscarMedia = vi.fn(async function ()
    {
      return cenario.media === undefined ? { id: "m1" } : cenario.media;
    });
    // A escada de fontes virou uma so (#254).
    const buscarNaFonte = vi.fn(async function (): Promise<ResultadoDaFonte>
    {
      if (cenario.aniList instanceof Error)
      {
        if (cenario.kitsu instanceof Error || cenario.kitsu === undefined)
        {
          return { estado: "indisponivel" };
        }
        return { estado: "ok", obra: cenario.kitsu, respondeu: "kitsu" };
      }
      return { estado: "ok", obra: cenario.aniList === undefined ? OBRA : cenario.aniList, respondeu: "anilist" };
    });
    const salvarMedia = vi.fn(async function () { return { id: "m-novo" }; });
    const adicionar = vi.fn(async function (): Promise<{ jaExistia: boolean } | { cheia: true } | null>
    {
      return cenario.adicionar === undefined ? { jaExistia: false } : cenario.adicionar;
    });

    return {
      deps: { buscarMedia, buscarNaFonte, salvarMedia, adicionar, limitar },
      buscarNaFonte,
      salvarMedia,
      adicionar,
    };
  }

  const REFERENCIA = { fonte: "anilist" as const, id: 30013 };
  const PEDIDO = { userId: "u1", listaId: "l1", referencia: REFERENCIA };

  it("acima do teto por usuario nao consulta o AniList nem grava", async function ()
  {
    const { deps, buscarNaFonte, adicionar } = fakeDeps({ media: null });
    limitar.mockResolvedValueOnce({ bloqueado: true, esperarSegundos: 45 });

    await expect(adicionarObraNaLista(PEDIDO, deps))
      .resolves.toEqual({ estado: "limitado", esperarSegundos: 45 });
    expect(buscarNaFonte).not.toHaveBeenCalled();
    expect(adicionar).not.toHaveBeenCalled();
  });

  it("obra em cache entra sem ir ao AniList, em qualquer idade", async function ()
  {
    const { deps, adicionar, buscarNaFonte, salvarMedia } = fakeDeps({});

    await expect(adicionarObraNaLista(PEDIDO, deps))
      .resolves.toEqual({ estado: "ok", contem: true });
    expect(adicionar).toHaveBeenCalledWith("u1", "l1", "m1");
    expect(buscarNaFonte).not.toHaveBeenCalled();
    expect(salvarMedia).not.toHaveBeenCalled();
  });

  it("obra que já estava continua lá: ok, sem remover (não é toggle)", async function ()
  {
    const { deps } = fakeDeps({ adicionar: { jaExistia: true } });

    await expect(adicionarObraNaLista(PEDIDO, deps))
      .resolves.toEqual({ estado: "ok", contem: true });
  });

  it("obra fora do cache vem da fonte, é cacheada e entra", async function ()
  {
    const { deps, salvarMedia, adicionar, buscarNaFonte } = fakeDeps({ media: null });

    await expect(adicionarObraNaLista(PEDIDO, deps))
      .resolves.toEqual({ estado: "ok", contem: true });
    expect(salvarMedia).toHaveBeenCalledWith(OBRA, expect.any(Date));
    expect(adicionar).toHaveBeenCalledWith("u1", "l1", "m-novo");
    expect(buscarNaFonte).toHaveBeenCalledWith(REFERENCIA);
  });

  it("AniList fora: busca no Kitsu, cacheia e entra", async function ()
  {
    const { deps, salvarMedia, adicionar } = fakeDeps({
      media: null,
      aniList: new Error("AniList fora"),
      kitsu: OBRA,
    });

    await expect(adicionarObraNaLista(PEDIDO, deps))
      .resolves.toEqual({ estado: "ok", contem: true });
    expect(salvarMedia).toHaveBeenCalledWith(OBRA, expect.any(Date));
    expect(adicionar).toHaveBeenCalledWith("u1", "l1", "m-novo");
  });

  it("as duas fontes fora: indisponivel, nada gravado", async function ()
  {
    const { deps, salvarMedia, adicionar } = fakeDeps({
      media: null,
      aniList: new Error("AniList fora"),
      kitsu: new Error("Kitsu fora"),
    });

    await expect(adicionarObraNaLista(PEDIDO, deps))
      .resolves.toEqual({ estado: "indisponivel" });
    expect(salvarMedia).not.toHaveBeenCalled();
    expect(adicionar).not.toHaveBeenCalled();
  });

  it("obra que o domínio descarta é obra_desconhecida, nada gravado", async function ()
  {
    const { deps, salvarMedia, adicionar } = fakeDeps({ media: null, aniList: null });

    await expect(adicionarObraNaLista(PEDIDO, deps))
      .resolves.toEqual({ estado: "obra_desconhecida" });
    expect(salvarMedia).not.toHaveBeenCalled();
    expect(adicionar).not.toHaveBeenCalled();
  });

  it("lista lotada nao recebe mais: lista_cheia (#135)", async function ()
  {
    const { deps } = fakeDeps({ adicionar: { cheia: true } });

    await expect(adicionarObraNaLista(PEDIDO, deps))
      .resolves.toEqual({ estado: "lista_cheia" });
  });

  it("lista alheia ou inexistente é nao_encontrada", async function ()
  {
    const { deps } = fakeDeps({ adicionar: null });

    await expect(adicionarObraNaLista({ ...PEDIDO, listaId: "alheia" }, deps))
      .resolves.toEqual({ estado: "nao_encontrada" });
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
      { userId: "u1", listaId: "l1", referencia: { fonte: "anilist" as const, id: 30656 } },
      deps,
    );

    expect(resultado).toEqual({ estado: "ok" });
    expect(remover).toHaveBeenCalledWith("u1", "l1", "m1");
  });

  it("lista alheia, inexistente ou obra já fora é nao_encontrada — nunca adiciona", async function ()
  {
    const { deps } = fakeDeps({ remover: null });

    const resultado = await removerObraDaLista(
      { userId: "u1", listaId: "l1", referencia: { fonte: "anilist" as const, id: 30656 } },
      deps,
    );

    expect(resultado).toEqual({ estado: "nao_encontrada" });
  });

  it("obra fora do cache é obra_desconhecida, sem tocar a lista", async function ()
  {
    const { deps, remover } = fakeDeps({ media: null });

    const resultado = await removerObraDaLista(
      { userId: "u1", listaId: "l1", referencia: { fonte: "anilist" as const, id: 30656 } },
      deps,
    );

    expect(resultado).toEqual({ estado: "obra_desconhecida" });
    expect(remover).not.toHaveBeenCalled();
  });
});
