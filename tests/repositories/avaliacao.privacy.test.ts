import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "@/server/repositories/prisma";
import { salvarMediaDoAniList } from "@/server/repositories/media.repository";
import {
  listarAvaliacoes,
  removerAvaliacao,
  salvarAvaliacao,
} from "@/server/repositories/avaliacao.repository";
import { limparBanco, semearUsuario } from "./apoio";

// As regras de banco da issue #33: uma avaliação por (userId, mediaId) —
// avaliar de novo edita, nunca duplica. Avaliação de um usuário não aparece
// nem é removível por outro. O CHECK da meia estrela vive no banco.

const OBRA = {
  anilistId: 30013,
  type: "MANGA" as const,
  titleRomaji: "Vinland Saga",
  chapters: 224,
};

beforeEach(limparBanco);

describe("salvarAvaliacao", function ()
{
  it("avaliar de novo edita a mesma linha, nunca duplica", async function ()
  {
    const usuario = await semearUsuario("rankine");
    const media = await salvarMediaDoAniList(OBRA, new Date());

    const primeira = await salvarAvaliacao({
      userId: usuario.id,
      mediaId: media.id,
      rating: 4.5,
      review: null,
      containsSpoilers: false,
    });
    const segunda = await salvarAvaliacao({
      userId: usuario.id,
      mediaId: media.id,
      rating: 5,
      review: "obra-prima",
      containsSpoilers: true,
    });

    expect(segunda.id).toBe(primeira.id);
    expect(await getPrisma().entry.count()).toBe(1);

    const [avaliacao] = await listarAvaliacoes(usuario.id);
    expect(avaliacao).toEqual({
      mediaId: media.id,
      rating: "5",
      review: "obra-prima",
      containsSpoilers: true,
    });
  });

  it("o CHECK do banco recusa nota fora da meia estrela", async function ()
  {
    const usuario = await semearUsuario("rankine");
    const media = await salvarMediaDoAniList(OBRA, new Date());

    await expect(
      salvarAvaliacao({
        userId: usuario.id,
        mediaId: media.id,
        rating: 3.7,
        review: null,
        containsSpoilers: false,
      }),
    ).rejects.toThrowError();
  });
});

describe("privacidade da avaliação", function ()
{
  it("avaliação de um usuário não aparece para outro", async function ()
  {
    const dono = await semearUsuario("dono");
    const outro = await semearUsuario("outro");
    const media = await salvarMediaDoAniList(OBRA, new Date());

    await salvarAvaliacao({
      userId: dono.id,
      mediaId: media.id,
      rating: 4,
      review: null,
      containsSpoilers: false,
    });

    await expect(listarAvaliacoes(outro.id)).resolves.toEqual([]);
  });

  it("remover avaliação alheia não encontra nada e não apaga", async function ()
  {
    const dono = await semearUsuario("dono");
    const intruso = await semearUsuario("intruso");
    const media = await salvarMediaDoAniList(OBRA, new Date());

    await salvarAvaliacao({
      userId: dono.id,
      mediaId: media.id,
      rating: 4,
      review: null,
      containsSpoilers: false,
    });

    await expect(removerAvaliacao(intruso.id, media.id)).resolves.toBeNull();
    await expect(listarAvaliacoes(dono.id)).resolves.toHaveLength(1);

    await expect(removerAvaliacao(dono.id, media.id)).resolves.toEqual({
      removida: true,
    });
    await expect(listarAvaliacoes(dono.id)).resolves.toEqual([]);
  });
});
