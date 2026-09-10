import { describe, expect, it, vi } from "vitest";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import type { ResultadoDaFonte } from "@/server/services/obra-externa.service";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import {
  adicionarNaEstante,
  type DependenciasDaEstante,
} from "@/server/services/estante.service";

// As regras da issue #10: cache fresco não chama o AniList; cache velho ou
// ausente chama e regrava; obra que o domínio descarta não vira linha; e a
// entrada da estante é upsert — o serviço só orquestra, a unicidade é do banco.

const AGORA = new Date("2026-08-31T12:00:00Z");
const FRESCO = new Date(AGORA.getTime() - 60 * 60 * 1000); // 1h atrás
const VELHO = new Date(AGORA.getTime() - 25 * 60 * 60 * 1000); // 25h atrás

const OBRA_DO_ANILIST: MediaDoAniList = {
  anilistId: 30013,
  type: "MANGA",
  titleRomaji: "Vinland Saga",
  countryOfOrigin: "JP",
  chapters: 224,
};

function fakeDeps(cenario: {
  noBanco?: { id: string; syncedAt: Date };
  noAniList?: MediaDoAniList | null;
  anilistFora?: boolean;
  noKitsu?: MediaDoAniList | null;
  kitsuFora?: boolean;
})
{
  const buscarMediaNoBanco = vi.fn(async function ()
  {
    return cenario.noBanco ?? null;
  });

  const salvarMedia = vi.fn(async function ()
  {
    return { id: "m-nova", syncedAt: AGORA };
  });

  // A escada de fontes virou uma so (#254): o servico nao sabe mais quem e
  // AniList e quem e Kitsu, so pergunta pela referencia.
  const buscarNaFonte = vi.fn(async function (): Promise<ResultadoDaFonte>
  {
    if (cenario.anilistFora && cenario.kitsuFora)
    {
      return { estado: "indisponivel" };
    }

    if (cenario.anilistFora)
    {
      return { estado: "ok", obra: cenario.noKitsu ?? null, respondeu: "kitsu" };
    }

    return { estado: "ok", obra: cenario.noAniList ?? null, respondeu: "anilist" };
  });

  const gravarEntrada = vi.fn(async function (dados: {
    userId: string;
    mediaId: string;
    status: string;
  })
  {
    return { id: "e1", ...dados };
  });

  // Teto de entradas por usuario (#136).
  const limitar = vi.fn(async function (): Promise<Veredito> { return { bloqueado: false }; });

  const deps: DependenciasDaEstante = {
    buscarMediaNoBanco,
    salvarMedia,
    buscarNaFonte,
    gravarEntrada,
    limitar,
    relogio: function () { return AGORA; },
  };

  return { deps, buscarMediaNoBanco, salvarMedia, buscarNaFonte, gravarEntrada, limitar };
}

const REFERENCIA = { fonte: "anilist" as const, id: 30013 };
const PEDIDO = { userId: "u1", referencia: REFERENCIA, status: "PLANNED" as const };

describe("adicionarNaEstante", function ()
{
  it("acima do teto por usuario nao grava nem consulta o AniList (#136)", async function ()
  {
    const { deps, limitar, buscarNaFonte, gravarEntrada } = fakeDeps({});
    limitar.mockResolvedValueOnce({ bloqueado: true, esperarSegundos: 30 });

    await expect(adicionarNaEstante(PEDIDO, deps)).resolves.toEqual({ estado: "limitado", esperarSegundos: 30 });
    expect(buscarNaFonte).not.toHaveBeenCalled();
    expect(gravarEntrada).not.toHaveBeenCalled();
  });

  it("cache fresco: não chama o AniList e usa o media do banco", async function ()
  {
    const { deps, buscarNaFonte, salvarMedia, gravarEntrada } = fakeDeps({
      noBanco: { id: "m1", syncedAt: FRESCO },
    });

    const resultado = await adicionarNaEstante(PEDIDO, deps);

    expect(resultado.estado).toBe("ok");
    expect(buscarNaFonte).not.toHaveBeenCalled();
    expect(salvarMedia).not.toHaveBeenCalled();
    expect(gravarEntrada).toHaveBeenCalledExactlyOnceWith({
      userId: "u1",
      mediaId: "m1",
      status: "PLANNED",
    });
  });

  it("cache velho: volta a fonte e regrava o media", async function ()
  {
    const { deps, buscarNaFonte, salvarMedia, gravarEntrada } = fakeDeps({
      noBanco: { id: "m1", syncedAt: VELHO },
      noAniList: OBRA_DO_ANILIST,
    });

    const resultado = await adicionarNaEstante(PEDIDO, deps);

    expect(resultado.estado).toBe("ok");
    expect(buscarNaFonte).toHaveBeenCalledExactlyOnceWith(REFERENCIA);
    expect(salvarMedia).toHaveBeenCalledExactlyOnceWith(OBRA_DO_ANILIST, AGORA);
    expect(gravarEntrada).toHaveBeenCalledExactlyOnceWith({
      userId: "u1",
      mediaId: "m-nova",
      status: "PLANNED",
    });
  });

  it("sem cache: chama o AniList, grava media e entrada", async function ()
  {
    const { deps, salvarMedia, gravarEntrada } = fakeDeps({
      noAniList: OBRA_DO_ANILIST,
    });

    const resultado = await adicionarNaEstante(PEDIDO, deps);

    expect(resultado.estado).toBe("ok");
    expect(salvarMedia).toHaveBeenCalledOnce();
    expect(gravarEntrada).toHaveBeenCalledOnce();
  });

  it("obra que o domínio descarta (null) não vira linha em Media nem na estante", async function ()
  {
    const { deps, salvarMedia, gravarEntrada } = fakeDeps({ noAniList: null });

    const resultado = await adicionarNaEstante(PEDIDO, deps);

    expect(resultado.estado).toBe("obra_desconhecida");
    expect(salvarMedia).not.toHaveBeenCalled();
    expect(gravarEntrada).not.toHaveBeenCalled();
  });

  it("as duas fontes fora com cache velho: indisponível, nada gravado", async function ()
  {
    const { deps, salvarMedia, gravarEntrada } = fakeDeps({
      noBanco: { id: "m1", syncedAt: VELHO },
      anilistFora: true,
      kitsuFora: true,
    });

    const resultado = await adicionarNaEstante(PEDIDO, deps);

    expect(resultado.estado).toBe("indisponivel");
    expect(salvarMedia).not.toHaveBeenCalled();
    expect(gravarEntrada).not.toHaveBeenCalled();
  });

  // O degrau do #219: com o AniList fora, o Kitsu segura a adição. Sem isso o
  // botão "+ Estante" respondia "não deu" para toda obra fora do cache (#227).
  it("AniList fora: busca no Kitsu, grava media e entrada", async function ()
  {
    const { deps, buscarNaFonte, salvarMedia, gravarEntrada } = fakeDeps({
      anilistFora: true,
      noKitsu: OBRA_DO_ANILIST,
    });

    const resultado = await adicionarNaEstante(PEDIDO, deps);

    expect(resultado).toEqual({ estado: "ok", entradaId: "e1" });
    expect(buscarNaFonte).toHaveBeenCalledWith(REFERENCIA);
    expect(salvarMedia).toHaveBeenCalledWith(OBRA_DO_ANILIST, AGORA);
    expect(gravarEntrada).toHaveBeenCalled();
  });

  // Era "AniList de pé nunca chama o Kitsu". A escolha entre as fontes saiu
  // daqui em #254 e virou o `obra-externa.service`, que tem teste proprio; o
  // que a estante garante e que a obra vem da fonte e vira entrada.
  it("obra fora do cache vem da fonte e vira entrada", async function ()
  {
    const { deps, buscarNaFonte, gravarEntrada } = fakeDeps({ noAniList: OBRA_DO_ANILIST });

    const resultado = await adicionarNaEstante(PEDIDO, deps);

    expect(resultado.estado).toBe("ok");
    expect(buscarNaFonte).toHaveBeenCalledWith(REFERENCIA);
    expect(gravarEntrada).toHaveBeenCalled();
  });

  it("AniList fora e Kitsu sem a obra: obra desconhecida, nada gravado", async function ()
  {
    const { deps, salvarMedia, gravarEntrada } = fakeDeps({
      anilistFora: true,
      noKitsu: null,
    });

    const resultado = await adicionarNaEstante(PEDIDO, deps);

    expect(resultado.estado).toBe("obra_desconhecida");
    expect(salvarMedia).not.toHaveBeenCalled();
    expect(gravarEntrada).not.toHaveBeenCalled();
  });

  it("AniList fora com cache FRESCO nem consulta o Kitsu", async function ()
  {
    const { deps, buscarNaFonte, gravarEntrada } = fakeDeps({
      noBanco: { id: "m1", syncedAt: FRESCO },
      anilistFora: true,
    });

    const resultado = await adicionarNaEstante(PEDIDO, deps);

    expect(resultado.estado).toBe("ok");
    expect(buscarNaFonte).not.toHaveBeenCalled();
    expect(buscarNaFonte).not.toHaveBeenCalled();
    expect(gravarEntrada).toHaveBeenCalledWith(expect.objectContaining({ mediaId: "m1" }));
  });
});
