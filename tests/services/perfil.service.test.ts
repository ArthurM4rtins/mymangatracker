import { describe, expect, it, vi } from "vitest";
import { perfilDoUsuario } from "@/server/services/perfil.service";

// As regras da issue #49: perfil por username; inexistente = null sem
// consultar mais nada; o recorte que sai NÃO carrega id nem e-mail; a estante
// (status + capítulo) só entra quando quem olha É o dono; a grade de
// avaliadas sai filtrada e ordenada; resenhas recentes limitadas a 5.

const USUARIO = {
  id: "u1",
  username: "leitora",
  createdAt: new Date("2026-08-01T00:00:00Z"),
};

const OBRA = {
  anilistId: 30002,
  titleRomaji: "Berserk",
  titleEnglish: null,
  coverImageUrl: null,
};

function fakeDeps(cenario: { usuario?: typeof USUARIO | null })
{
  return {
    buscarPorUsername: vi.fn(async function ()
    {
      return cenario.usuario === undefined ? USUARIO : cenario.usuario;
    }),
    listarAvaliadas: vi.fn(async function ()
    {
      return [
        { ...OBRA, anilistId: 1, rating: 3, avaliadaEm: new Date("2026-08-01") },
        { ...OBRA, anilistId: 2, rating: 5, avaliadaEm: new Date("2026-08-03") },
        { ...OBRA, anilistId: 3, rating: 4.5, avaliadaEm: new Date("2026-08-02") },
      ];
    }),
    contarResenhas: vi.fn(async function () { return 1; }),
    contarCurtidasDadas: vi.fn(async function () { return 7; }),
    listarResenhas: vi.fn(async function ()
    {
      return [
        {
          entryId: "e1",
          ...OBRA,
          rating: "5",
          review: "obra-prima",
          containsSpoilers: false,
          publicadaEm: new Date("2026-08-20T00:00:00Z"),
          curtidas: 3,
        },
      ];
    }),
    listarListas: vi.fn(async function ()
    {
      return [
        {
          listaId: "l1",
          nome: "seinen",
          descricao: null,
          username: "leitora",
          totalDeObras: 2,
          capas: [],
        },
      ];
    }),
    listarEstante: vi.fn(async function ()
    {
      return [
        { entradaId: "s1", status: "READING" as const, progressChapter: "57.5", obra: OBRA },
        { entradaId: "s2", status: "COMPLETED" as const, progressChapter: null, obra: OBRA },
      ];
    }),
  };
}

const SEM_FILTRO = { ordem: "recentes" as const };

describe("perfilDoUsuario", function ()
{
  it("username inexistente devolve null sem consultar mais nada", async function ()
  {
    const deps = fakeDeps({ usuario: null });

    await expect(
      perfilDoUsuario({ username: "ninguem", viewerId: null, filtro: SEM_FILTRO }, deps),
    ).resolves.toBeNull();
    expect(deps.listarAvaliadas).not.toHaveBeenCalled();
    expect(deps.listarEstante).not.toHaveBeenCalled();
  });

  it("para quem não é o dono: números, avaliadas, resenhas e listas — sem estante", async function ()
  {
    const deps = fakeDeps({});

    const perfil = await perfilDoUsuario(
      { username: "leitora", viewerId: "u2", filtro: SEM_FILTRO },
      deps,
    );

    expect(perfil).toMatchObject({
      username: "leitora",
      membroDesde: USUARIO.createdAt,
      souEu: false,
      estante: null,
      numeros: { avaliadas: 3, resenhas: 1, listas: 1, curtidasDadas: 7 },
    });
    expect(perfil?.avaliadas.map(function (a) { return a.anilistId; })).toEqual([2, 3, 1]);
    expect(perfil?.resenhasRecentes.map(function (r) { return r.titleRomaji; })).toEqual([
      "Berserk",
    ]);
    expect(perfil?.listas.map(function (l) { return l.nome; })).toEqual(["seinen"]);
    expect(deps.listarResenhas).toHaveBeenCalledWith("u1", 5);
    expect(deps.listarEstante).not.toHaveBeenCalled();
  });

  it("para o dono: a estante entra, com contagem por status e capítulo", async function ()
  {
    const deps = fakeDeps({});

    const perfil = await perfilDoUsuario(
      { username: "leitora", viewerId: "u1", filtro: SEM_FILTRO },
      deps,
    );

    expect(perfil?.souEu).toBe(true);
    expect(perfil?.estante).toMatchObject({
      contagem: { READING: 1, COMPLETED: 1, PLANNED: 0, PAUSED: 0, DROPPED: 0 },
    });
    expect(perfil?.estante?.entradas[0]).toMatchObject({
      status: "READING",
      progressChapter: "57.5",
    });
  });

  it("aplica o filtro da URL na grade de avaliadas", async function ()
  {
    const perfil = await perfilDoUsuario(
      { username: "leitora", viewerId: null, filtro: { ordem: "maior_nota", nota: 5 } },
      fakeDeps({}),
    );

    expect(perfil?.avaliadas.map(function (a) { return a.anilistId; })).toEqual([2]);
    // O total conta todas, não só as filtradas.
    expect(perfil?.numeros.avaliadas).toBe(3);
  });

  it("o recorte que sai não carrega id de usuário", async function ()
  {
    const perfil = await perfilDoUsuario(
      { username: "leitora", viewerId: null, filtro: SEM_FILTRO },
      fakeDeps({}),
    );

    expect(perfil).not.toHaveProperty("id");
    expect(perfil).not.toHaveProperty("userId");
  });
});
