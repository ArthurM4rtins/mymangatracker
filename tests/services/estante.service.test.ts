import { describe, expect, it, vi } from "vitest";
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

  const buscarNoAniList = vi.fn(async function (): Promise<MediaDoAniList | null>
  {
    if (cenario.anilistFora)
    {
      throw new Error("anilist fora");
    }
    return cenario.noAniList ?? null;
  });

  const gravarEntrada = vi.fn(async function (dados: {
    userId: string;
    mediaId: string;
    status: string;
  })
  {
    return { id: "e1", ...dados };
  });

  const deps: DependenciasDaEstante = {
    buscarMediaNoBanco,
    salvarMedia,
    buscarNoAniList,
    gravarEntrada,
    relogio: function () { return AGORA; },
  };

  return { deps, buscarMediaNoBanco, salvarMedia, buscarNoAniList, gravarEntrada };
}

const PEDIDO = { userId: "u1", anilistId: 30013, status: "PLANNED" as const };

describe("adicionarNaEstante", function ()
{
  it("cache fresco: não chama o AniList e usa o media do banco", async function ()
  {
    const { deps, buscarNoAniList, salvarMedia, gravarEntrada } = fakeDeps({
      noBanco: { id: "m1", syncedAt: FRESCO },
    });

    const resultado = await adicionarNaEstante(PEDIDO, deps);

    expect(resultado.estado).toBe("ok");
    expect(buscarNoAniList).not.toHaveBeenCalled();
    expect(salvarMedia).not.toHaveBeenCalled();
    expect(gravarEntrada).toHaveBeenCalledExactlyOnceWith({
      userId: "u1",
      mediaId: "m1",
      status: "PLANNED",
    });
  });

  it("cache velho: chama o AniList e regrava o media", async function ()
  {
    const { deps, buscarNoAniList, salvarMedia, gravarEntrada } = fakeDeps({
      noBanco: { id: "m1", syncedAt: VELHO },
      noAniList: OBRA_DO_ANILIST,
    });

    const resultado = await adicionarNaEstante(PEDIDO, deps);

    expect(resultado.estado).toBe("ok");
    expect(buscarNoAniList).toHaveBeenCalledExactlyOnceWith(30013);
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

  it("AniList fora com cache velho: indisponível, nada gravado", async function ()
  {
    const { deps, salvarMedia, gravarEntrada } = fakeDeps({
      noBanco: { id: "m1", syncedAt: VELHO },
      anilistFora: true,
    });

    const resultado = await adicionarNaEstante(PEDIDO, deps);

    expect(resultado.estado).toBe("indisponivel");
    expect(salvarMedia).not.toHaveBeenCalled();
    expect(gravarEntrada).not.toHaveBeenCalled();
  });
});
