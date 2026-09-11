import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AutorDoAniList } from "@/server/domain/anilist-media";
import { autorParaPagina, autorParaPaginaDoSistema } from "@/server/services/autor.service";
import { buscarAutor } from "@/server/infra/anilist";
import { buscarAutorNoKitsu } from "@/server/infra/kitsu";

vi.mock("@/server/infra/kitsu", () => ({ buscarAutorNoKitsu: vi.fn() }));

vi.mock("@/server/infra/anilist", function ()
{
  return { buscarAutor: vi.fn() };
});

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
  it("consulta o perfil Kitsu sem confundir o ID com um staff do AniList", async () => {
    const perfil = { kitsuPersonId: 1677, nome: "Kentarou Miura", nomeNativo: null, imagemUrl: null, descricao: null, obras: [] };
    const buscarNoKitsu = vi.fn(async () => perfil);
    const buscarAutor = vi.fn(async () => INOUE);
    expect(await autorParaPagina({ fonte: "kitsu", id: 1677 }, { buscarAutor, buscarNoKitsu })).toEqual({ estado: "ok", autor: perfil });
    expect(buscarNoKitsu).toHaveBeenCalledWith(1677);
    expect(buscarAutor).not.toHaveBeenCalled();
  });

  it("falha do Kitsu não procura outra pessoa com o mesmo número no AniList", async () => {
    const buscarNoKitsu = vi.fn(async () => { throw Error("fora"); });
    const buscarAutor = vi.fn(async () => INOUE);
    expect(await autorParaPagina({ fonte: "kitsu", id: 1677 }, { buscarAutor, buscarNoKitsu })).toEqual({ estado: "indisponivel" });
    expect(buscarAutor).not.toHaveBeenCalled();
  });
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

// #134: o id vem da URL, então caminhar por ids era uma requisição nova ao
// AniList por id. Este teste passa pela COMPOSIÇÃO de propósito: é ela que
// pode errar, se o memo for criado dentro da função em vez de no módulo.
describe("autorParaPaginaDoSistema", function ()
{
  beforeEach(() => vi.clearAllMocks());

  it("lembra o perfil Kitsu sem compartilhar a chave numérica com o AniList", async () => {
    const perfil = { kitsuPersonId: 1677, nome: "Kentarou Miura", nomeNativo: null, imagemUrl: null, descricao: null, obras: [] };
    vi.mocked(buscarAutorNoKitsu).mockResolvedValue(perfil);
    await autorParaPaginaDoSistema({ fonte: "kitsu", id: 1677 });
    expect(await autorParaPaginaDoSistema({ fonte: "kitsu", id: 1677 })).toEqual({ estado: "ok", autor: perfil });
    expect(buscarAutorNoKitsu).toHaveBeenCalledTimes(1);
    vi.mocked(buscarAutor).mockResolvedValue({ ...INOUE, staffId: 1677 });
    expect(await autorParaPaginaDoSistema(1677)).toMatchObject({ estado: "ok", autor: { staffId: 1677 } });
    expect(buscarAutor).toHaveBeenCalledWith(1677);
  });
  it("o mesmo autor duas vezes é uma ida só ao AniList", async function ()
  {
    vi.mocked(buscarAutor).mockResolvedValue(INOUE);

    await autorParaPaginaDoSistema(INOUE.staffId);
    await autorParaPaginaDoSistema(INOUE.staffId);

    expect(buscarAutor).toHaveBeenCalledTimes(1);
  });

  it("id diferente é ida nova", async function ()
  {
    vi.mocked(buscarAutor).mockResolvedValue(INOUE);

    await autorParaPaginaDoSistema(12345);

    expect(buscarAutor).toHaveBeenCalledWith(12345);
  });
});
