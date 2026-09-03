import { describe, expect, it, vi } from "vitest";
import type { AutorDoAniList } from "@/server/domain/anilist-media";
import { autorParaPagina } from "@/server/services/autor.service";

// As regras da issue #43: leitura ao vivo do AniList — inexistente e
// indisponível são estados distintos, e nada aqui vira 500.

const INOUE: AutorDoAniList = {
  staffId: 96911,
  nome: "Takehiko Inoue",
  nomeNativo: "井上雄彦",
  imagemUrl: null,
  descricao: null,
  obras: [],
};

describe("autorParaPagina", function ()
{
  it("devolve o autor quando o AniList responde", async function ()
  {
    const buscarAutor = vi.fn(async function () { return INOUE; });

    const resultado = await autorParaPagina(96911, { buscarAutor });

    expect(buscarAutor).toHaveBeenCalledWith(96911);
    expect(resultado).toEqual({ estado: "ok", autor: INOUE });
  });

  it("staff inexistente é nao_encontrado", async function ()
  {
    const buscarAutor = vi.fn(async function () { return null; });

    await expect(autorParaPagina(1, { buscarAutor })).resolves.toEqual({
      estado: "nao_encontrado",
    });
  });

  it("AniList fora é indisponivel, nunca exceção", async function ()
  {
    const buscarAutor = vi.fn(async function (): Promise<AutorDoAniList | null>
    {
      throw new Error("fora");
    });

    await expect(autorParaPagina(96911, { buscarAutor })).resolves.toEqual({
      estado: "indisponivel",
    });
  });
});
