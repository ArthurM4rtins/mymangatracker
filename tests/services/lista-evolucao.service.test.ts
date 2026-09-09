import { describe, expect, it, vi } from "vitest";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import {
  curtirLista,
  listasPublicas,
  editarListaDoUsuario,
  reordenarItensDaLista,
} from "@/server/services/lista.service";

// A evolução das listas (issue #51): editar nome/descrição com a mesma regra
// da criação; reordenar só com permutação exata dos itens atuais; curtir é
// toggle e devolve o estado final. Posse decide no repositório (null).

describe("editarListaDoUsuario", function ()
{
  it("apara o nome, descrição em branco vira null, alheia é nao_encontrada", async function ()
  {
    const editar = vi.fn(async function (): Promise<{ editada: true } | null>
    {
      return { editada: true };
    });

    await expect(
      editarListaDoUsuario(
        { userId: "u1", listaId: "l1", nome: "  clássicos  ", descricao: "  " },
        { editar },
      ),
    ).resolves.toEqual({ estado: "ok" });
    expect(editar).toHaveBeenCalledWith("u1", "l1", { nome: "clássicos", descricao: null });

    editar.mockResolvedValueOnce(null);
    await expect(
      editarListaDoUsuario(
        { userId: "u2", listaId: "l1", nome: "x", descricao: null },
        { editar },
      ),
    ).resolves.toEqual({ estado: "nao_encontrada" });
  });

  it("nome vazio ou acima de 100 é inválido sem tocar o banco", async function ()
  {
    const editar = vi.fn();

    await expect(
      editarListaDoUsuario({ userId: "u1", listaId: "l1", nome: " ", descricao: null }, { editar }),
    ).resolves.toEqual({ estado: "lista_invalida" });
    await expect(
      editarListaDoUsuario(
        { userId: "u1", listaId: "l1", nome: "x".repeat(101), descricao: null },
        { editar },
      ),
    ).resolves.toEqual({ estado: "lista_invalida" });
    expect(editar).not.toHaveBeenCalled();
  });
});

describe("reordenarItensDaLista", function ()
{
  function fakeDeps(
    atual: Array<{ anilistId: number; mediaId: string }> | null,
    veredito: Veredito = { bloqueado: false },
  )
  {
    return {
      listarItens: vi.fn(async function () { return atual; }),
      reordenar: vi.fn(async function () { return { reordenada: true as const }; }),
      limitar: vi.fn(async function () { return veredito; }),
    };
  }

  it("grava a ordem proposta traduzida para mediaIds", async function ()
  {
    const deps = fakeDeps([
      { anilistId: 1, mediaId: "m1" },
      { anilistId: 2, mediaId: "m2" },
      { anilistId: 3, mediaId: "m3" },
    ]);

    await expect(
      reordenarItensDaLista({ userId: "u1", listaId: "l1", anilistIds: [3, 1, 2] }, deps),
    ).resolves.toEqual({ estado: "ok" });
    expect(deps.reordenar).toHaveBeenCalledWith("u1", "l1", ["m3", "m1", "m2"]);
  });

  it("proposta que não é permutação exata é ordem_invalida sem gravar", async function ()
  {
    const deps = fakeDeps([
      { anilistId: 1, mediaId: "m1" },
      { anilistId: 2, mediaId: "m2" },
    ]);

    await expect(
      reordenarItensDaLista({ userId: "u1", listaId: "l1", anilistIds: [1] }, deps),
    ).resolves.toEqual({ estado: "ordem_invalida" });
    await expect(
      reordenarItensDaLista({ userId: "u1", listaId: "l1", anilistIds: [1, 1] }, deps),
    ).resolves.toEqual({ estado: "ordem_invalida" });
    expect(deps.reordenar).not.toHaveBeenCalled();
  });

  it("lista alheia ou inexistente é nao_encontrada", async function ()
  {
    const deps = fakeDeps(null);

    await expect(
      reordenarItensDaLista({ userId: "u2", listaId: "l1", anilistIds: [] }, deps),
    ).resolves.toEqual({ estado: "nao_encontrada" });
    expect(deps.reordenar).not.toHaveBeenCalled();
  });

  // #146: reordenar era a escrita autenticada mais cara sem teto nenhum. O
  // limite corre ANTES de ler os itens — pedido bloqueado não custa banco.
  it("acima do teto é muitos_pedidos, sem ler nem gravar", async function ()
  {
    const deps = fakeDeps(
      [{ anilistId: 1, mediaId: "m1" }],
      { bloqueado: true, esperarSegundos: 42 },
    );

    await expect(
      reordenarItensDaLista({ userId: "u1", listaId: "l1", anilistIds: [1] }, deps),
    ).resolves.toEqual({ estado: "muitos_pedidos", esperarSegundos: 42 });
    expect(deps.listarItens).not.toHaveBeenCalled();
    expect(deps.reordenar).not.toHaveBeenCalled();
  });

  it("dentro do teto, o limite é chamado com o dono e a ordem grava", async function ()
  {
    const deps = fakeDeps([{ anilistId: 1, mediaId: "m1" }]);

    await expect(
      reordenarItensDaLista({ userId: "u1", listaId: "l1", anilistIds: [1] }, deps),
    ).resolves.toEqual({ estado: "ok" });
    expect(deps.limitar).toHaveBeenCalledWith("u1");
  });
});

describe("curtirLista", function ()
{
  it("repassa o toggle e devolve o estado final", async function ()
  {
    const alternar = vi.fn(async function () { return { curtida: true, total: 3 }; });

    await expect(curtirLista({ userId: "u1", listaId: "l1" }, { alternar })).resolves.toEqual({
      estado: "ok",
      curtida: true,
      total: 3,
    });
    expect(alternar).toHaveBeenCalledWith("l1", "u1");
  });

  it("lista inexistente é nao_encontrada", async function ()
  {
    const alternar = vi.fn(async function () { return null; });

    await expect(curtirLista({ userId: "u1", listaId: "nada" }, { alternar })).resolves.toEqual({
      estado: "nao_encontrada",
    });
  });
});

// #144: trinta cards ordenados só por data deixavam uma conta ocupar a página
// inteira. O rodízio vale nas duas ordenações.
describe("listasPublicas", function ()
{
  function cards(autores: string[])
  {
    return autores.map(function (username, indice)
    {
      return { listaId: `l${indice}`, username } as never;
    });
  }

  it("no máximo duas por autor, pedindo mais do que exibe", async function ()
  {
    const listar = vi.fn(async function ()
    {
      return cards(Array.from({ length: 60 }, function (_, i) { return i < 50 ? "spam" : `outro${i}`; }));
    });

    const publicas = await listasPublicas("recentes", { listar });

    expect(listar).toHaveBeenCalledWith(120, "recentes");
    expect(publicas.filter(function (l) { return l.username === "spam"; })).toHaveLength(2);
    expect(publicas).toHaveLength(12);
  });

  it("vale também para a ordenação por curtidas", async function ()
  {
    const listar = vi.fn(async function () { return cards(["spam", "spam", "spam", "bia"]); });

    const publicas = await listasPublicas("curtidas", { listar });

    expect(listar).toHaveBeenCalledWith(120, "curtidas");
    expect(publicas.map(function (l) { return l.username; })).toEqual(["spam", "spam", "bia"]);
  });
});
