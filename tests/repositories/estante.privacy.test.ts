import { beforeEach, describe, expect, it } from "vitest";
import { salvarMediaDoAniList } from "@/server/repositories/media.repository";
import {
  adicionarOuAtualizarEntrada,
  atualizarStatusDaEntrada,
  listarEntradasDoUsuario,
} from "@/server/repositories/shelf.repository";
import { limparBanco, semearUsuario } from "./apoio";

// As regras de banco da issue #11: a estante é privada do dono. Listagem nunca
// mistura usuários, e mudar status de entrada alheia não encontra nada — o
// mesmo `null` de entrada inexistente, para não revelar que ela existe.

const OBRA = {
  anilistId: 30013,
  type: "MANGA" as const,
  titleRomaji: "Vinland Saga",
  chapters: 224,
};

const OUTRA_OBRA = {
  anilistId: 30002,
  type: "MANGA" as const,
  titleRomaji: "Berserk",
  chapters: 380,
};

beforeEach(limparBanco);

describe("listarEntradasDoUsuario", function ()
{
  it("devolve só as entradas do usuário consultado", async function ()
  {
    const um = await semearUsuario("um");
    const outro = await semearUsuario("outro");
    const media = await salvarMediaDoAniList(OBRA, new Date());

    await adicionarOuAtualizarEntrada({ userId: um.id, mediaId: media.id, status: "READING" });
    await adicionarOuAtualizarEntrada({ userId: outro.id, mediaId: media.id, status: "PLANNED" });

    const doUm = await listarEntradasDoUsuario(um.id);

    expect(doUm).toHaveLength(1);
    expect(doUm[0].status).toBe("READING");
    expect(doUm[0].obra.titleRomaji).toBe("Vinland Saga");
  });

  it("filtra por status quando pedido", async function ()
  {
    const usuario = await semearUsuario("rankine");
    const lendo = await salvarMediaDoAniList(OBRA, new Date());
    const planejada = await salvarMediaDoAniList(OUTRA_OBRA, new Date());

    await adicionarOuAtualizarEntrada({ userId: usuario.id, mediaId: lendo.id, status: "READING" });
    await adicionarOuAtualizarEntrada({ userId: usuario.id, mediaId: planejada.id, status: "PLANNED" });

    const soLendo = await listarEntradasDoUsuario(usuario.id, "READING");

    expect(soLendo).toHaveLength(1);
    expect(soLendo[0].obra.titleRomaji).toBe("Vinland Saga");
  });

  it("estante vazia é lista vazia, não erro", async function ()
  {
    const usuario = await semearUsuario("novato");

    await expect(listarEntradasDoUsuario(usuario.id)).resolves.toEqual([]);
  });
});

describe("atualizarStatusDaEntrada", function ()
{
  it("atualiza a entrada do próprio usuário", async function ()
  {
    const usuario = await semearUsuario("rankine");
    const media = await salvarMediaDoAniList(OBRA, new Date());
    const entrada = await adicionarOuAtualizarEntrada({
      userId: usuario.id,
      mediaId: media.id,
      status: "READING",
    });

    const resultado = await atualizarStatusDaEntrada(usuario.id, entrada.id, "COMPLETED");

    expect(resultado).toEqual({ id: entrada.id });

    const [depois] = await listarEntradasDoUsuario(usuario.id);
    expect(depois.status).toBe("COMPLETED");
  });

  it("entrada de outro usuário não é encontrada nem alterada", async function ()
  {
    const dono = await semearUsuario("dono");
    const intruso = await semearUsuario("intruso");
    const media = await salvarMediaDoAniList(OBRA, new Date());
    const entrada = await adicionarOuAtualizarEntrada({
      userId: dono.id,
      mediaId: media.id,
      status: "READING",
    });

    const resultado = await atualizarStatusDaEntrada(intruso.id, entrada.id, "DROPPED");

    expect(resultado).toBeNull();

    const [doDono] = await listarEntradasDoUsuario(dono.id);
    expect(doDono.status).toBe("READING");
  });

  it("entrada inexistente responde igual à alheia", async function ()
  {
    const usuario = await semearUsuario("rankine");

    await expect(
      atualizarStatusDaEntrada(usuario.id, "nao-existe", "READING"),
    ).resolves.toBeNull();
  });
});
