import { beforeEach, describe, expect, it } from "vitest";
import { salvarMediaDoAniList } from "@/server/repositories/media.repository";
import {
  adicionarItem,
  alternarCurtidaDaLista,
  buscarListaComItens,
  criarLista,
  editarLista,
  listarItensParaOrdem,
  listarListasPublicas,
  reordenarItens,
} from "@/server/repositories/lista.repository";
import { limparBanco, semearUsuario } from "./apoio";

// A evolução das listas (issue #51) no banco: editar e reordenar só do dono
// (alheia = null, nada muda); curtida é toggle, conta no card e na página,
// e quem curtiu nunca aparece — só o "curtiPorMim" de quem olha.

const OBRAS = [
  { anilistId: 30013, type: "MANGA" as const, titleRomaji: "Vinland Saga", chapters: 224 },
  { anilistId: 30002, type: "MANGA" as const, titleRomaji: "Berserk", chapters: 380 },
  { anilistId: 30656, type: "MANGA" as const, titleRomaji: "Vagabond", chapters: 327 },
];

beforeEach(limparBanco);

async function semearListaComTres()
{
  const dona = await semearUsuario("dona");
  const lista = await criarLista({ userId: dona.id, nome: "trio", descricao: null });
  const medias = [];

  for (const obra of OBRAS)
  {
    const media = await salvarMediaDoAniList(obra, new Date());
    await adicionarItem(dona.id, lista.id, media.id);
    medias.push(media);
  }

  return { dona, lista, medias };
}

describe("editarLista", function ()
{
  it("edita a do dono; alheia não muda e devolve null", async function ()
  {
    const { dona, lista } = await semearListaComTres();
    const intruso = await semearUsuario("intruso");

    expect(await editarLista(intruso.id, lista.id, { nome: "hackeada", descricao: null })).toBeNull();
    expect(await editarLista(dona.id, lista.id, { nome: "trio épico", descricao: "os três" })).toEqual({ editada: true });

    const detalhe = await buscarListaComItens(lista.id, null);
    expect(detalhe).toMatchObject({ nome: "trio épico", descricao: "os três" });
  });
});

describe("reordenarItens", function ()
{
  it("grava a ordem nova; adicionar depois entra no fim; alheia devolve null", async function ()
  {
    const { dona, lista, medias } = await semearListaComTres();
    const intruso = await semearUsuario("intruso");

    expect(await reordenarItens(intruso.id, lista.id, [medias[2].id])).toBeNull();

    expect(await reordenarItens(dona.id, lista.id, [medias[2].id, medias[0].id, medias[1].id])).toEqual({ reordenada: true });

    const ordem = await listarItensParaOrdem(dona.id, lista.id);
    expect(ordem?.map(function (i) { return i.anilistId; })).toEqual([30656, 30013, 30002]);
    expect(await listarItensParaOrdem(intruso.id, lista.id)).toBeNull();

    const quarta = await salvarMediaDoAniList(
      { anilistId: 30642, type: "MANGA" as const, titleRomaji: "Vinland 2", chapters: 1 },
      new Date(),
    );
    await adicionarItem(dona.id, lista.id, quarta.id);
    const depois = await buscarListaComItens(lista.id, null);
    expect(depois?.itens.map(function (i) { return i.anilistId; })).toEqual([30656, 30013, 30002, 30642]);
  });
});

describe("alternarCurtidaDaLista", function ()
{
  it("toggle conta no card e na página; quem curtiu não sai; lista inexistente é null", async function ()
  {
    const { lista } = await semearListaComTres();
    const fa = await semearUsuario("fa");

    expect(await alternarCurtidaDaLista(lista.id, fa.id)).toEqual({ curtida: true, total: 1 });

    const comigo = await buscarListaComItens(lista.id, fa.id);
    expect(comigo).toMatchObject({ curtidas: 1, curtiPorMim: true });
    const anonimo = await buscarListaComItens(lista.id, null);
    expect(anonimo).toMatchObject({ curtidas: 1, curtiPorMim: false });
    expect(JSON.stringify([comigo, anonimo])).not.toContain(fa.id);

    const cards = await listarListasPublicas(10);
    expect(cards[0]?.curtidas).toBe(1);

    expect(await alternarCurtidaDaLista(lista.id, fa.id)).toEqual({ curtida: false, total: 0 });
    expect(await alternarCurtidaDaLista("nao-existe", fa.id)).toBeNull();
  });
});
