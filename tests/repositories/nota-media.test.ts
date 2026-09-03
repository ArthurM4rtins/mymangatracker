import { beforeEach, describe, expect, it } from "vitest";
import { salvarMediaDoAniList } from "@/server/repositories/media.repository";
import {
  contarNotasPorValor,
  salvarAvaliacao,
} from "@/server/repositories/avaliacao.repository";
import { limparBanco, semearUsuario } from "./apoio";

// A nota do Kidoku (issue #48): agregado de TODOS os usuários por obra, só
// valor e contagem — sem userId, sem resenha. Nota nula (resenha sem nota)
// fica fora; outra obra não entra na conta.

const OBRA = {
  anilistId: 30013,
  type: "MANGA" as const,
  titleRomaji: "Vinland Saga",
  chapters: 224,
};

const OUTRA = {
  anilistId: 30002,
  type: "MANGA" as const,
  titleRomaji: "Berserk",
  chapters: 380,
};

beforeEach(limparBanco);

describe("contarNotasPorValor", function ()
{
  it("agrupa por valor, ignora resenha sem nota e não mistura obras", async function ()
  {
    const [a, b, c, d] = await Promise.all([
      semearUsuario("a"),
      semearUsuario("b"),
      semearUsuario("c"),
      semearUsuario("d"),
    ]);
    const media = await salvarMediaDoAniList(OBRA, new Date());
    const outra = await salvarMediaDoAniList(OUTRA, new Date());

    await salvarAvaliacao({ userId: a.id, mediaId: media.id, rating: 5, review: null, containsSpoilers: false });
    await salvarAvaliacao({ userId: b.id, mediaId: media.id, rating: 5, review: "top", containsSpoilers: false });
    await salvarAvaliacao({ userId: c.id, mediaId: media.id, rating: 3.5, review: null, containsSpoilers: false });
    await salvarAvaliacao({ userId: d.id, mediaId: media.id, rating: null, review: "sem nota", containsSpoilers: false });
    await salvarAvaliacao({ userId: a.id, mediaId: outra.id, rating: 1, review: null, containsSpoilers: false });

    const contagens = await contarNotasPorValor(media.id);

    expect(contagens).toHaveLength(2);
    expect(contagens).toEqual(
      expect.arrayContaining([
        { rating: 5, total: 2 },
        { rating: 3.5, total: 1 },
      ]),
    );
    const serializado = JSON.stringify(contagens);
    expect(serializado).not.toContain(a.id);
    expect(serializado).not.toContain("top");
  });

  it("obra sem nota devolve lista vazia", async function ()
  {
    const media = await salvarMediaDoAniList(OBRA, new Date());

    await expect(contarNotasPorValor(media.id)).resolves.toEqual([]);
  });
});
