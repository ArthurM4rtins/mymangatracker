import { describe, expect, it, vi } from "vitest";
import { perfilPublico } from "@/server/services/perfil.service";

// As regras da issue #49: perfil por username; inexistente = null sem
// consultar mais nada; o recorte que sai NÃO carrega id nem e-mail; estante só
// em contagens; resenhas recentes limitadas a 5.

const USUARIO = {
  id: "u1",
  username: "leitora",
  createdAt: new Date("2026-08-01T00:00:00Z"),
};

function fakeDeps(cenario: { usuario?: typeof USUARIO | null })
{
  return {
    buscarPorUsername: vi.fn(async function ()
    {
      return cenario.usuario === undefined ? USUARIO : cenario.usuario;
    }),
    contarEstante: vi.fn(async function ()
    {
      return [
        { status: "READING" as const, total: 2 },
        { status: "COMPLETED" as const, total: 5 },
      ];
    }),
    contarAvaliacoes: vi.fn(async function () { return 4; }),
    listarResenhas: vi.fn(async function ()
    {
      return [
        {
          entryId: "e1",
          anilistId: 30002,
          titleRomaji: "Berserk",
          titleEnglish: null,
          coverImageUrl: null,
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
  };
}

describe("perfilPublico", function ()
{
  it("username inexistente devolve null sem consultar mais nada", async function ()
  {
    const deps = fakeDeps({ usuario: null });

    await expect(perfilPublico("ninguem", deps)).resolves.toBeNull();
    expect(deps.contarEstante).not.toHaveBeenCalled();
    expect(deps.listarResenhas).not.toHaveBeenCalled();
    expect(deps.listarListas).not.toHaveBeenCalled();
  });

  it("compõe contagens, resenhas recentes e listas do usuário", async function ()
  {
    const deps = fakeDeps({});

    const perfil = await perfilPublico("leitora", deps);

    expect(perfil).toMatchObject({
      username: "leitora",
      membroDesde: USUARIO.createdAt,
      estante: { READING: 2, COMPLETED: 5, PLANNED: 0, PAUSED: 0, DROPPED: 0 },
      totalNaEstante: 7,
      avaliacoes: 4,
    });
    expect(perfil?.resenhasRecentes.map(function (r) { return r.titleRomaji; })).toEqual([
      "Berserk",
    ]);
    expect(perfil?.listas.map(function (l) { return l.nome; })).toEqual(["seinen"]);
    expect(deps.listarResenhas).toHaveBeenCalledWith("u1", 5);
  });

  it("o recorte que sai não carrega id de usuário", async function ()
  {
    const perfil = await perfilPublico("leitora", fakeDeps({}));

    expect(perfil).not.toHaveProperty("id");
    expect(perfil).not.toHaveProperty("userId");
  });
});
