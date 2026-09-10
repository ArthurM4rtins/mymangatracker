import { beforeEach, describe, expect, it } from "vitest";

import { getPrisma } from "@/server/repositories/prisma";
import { limparBanco } from "./apoio";

/**
 * A identidade externa da obra (#254).
 *
 * Era `anilistId` obrigatório, e o que o AniList não conhecia sumia: "The
 * Beginning After the End" tem três registros no Kitsu e NENHUM com mapeamento.
 * Agora os dois campos são anuláveis, mas UM deles é obrigatório — e quem cobra
 * isso é um `CHECK` escrito à mão na migration, porque o Prisma não gera.
 *
 * Sem esse `CHECK`, uma linha sem nenhuma identidade entraria no banco e ficaria
 * inalcançável por qualquer URL do site.
 */
beforeEach(limparBanco);

const CAMPOS_OBRIGATORIOS = {
  type: "MANGA" as const,
  titleRomaji: "The Beginning After the End",
  syncedAt: new Date(),
};

describe("identidade externa da obra", function ()
{
  it("aceita obra que so existe no Kitsu", async function ()
  {
    const media = await getPrisma().media.create({
      data: { ...CAMPOS_OBRIGATORIOS, kitsuId: 54598 },
    });

    expect(media.kitsuId).toBe(54598);
    expect(media.anilistId).toBeNull();
  });

  it("aceita obra que so existe no AniList, como sempre foi", async function ()
  {
    const media = await getPrisma().media.create({
      data: { ...CAMPOS_OBRIGATORIOS, titleRomaji: "Berserk", anilistId: 30002 },
    });

    expect(media.anilistId).toBe(30002);
    expect(media.kitsuId).toBeNull();
  });

  it("aceita os dois nomes na MESMA linha, que e o caso com mapeamento", async function ()
  {
    const media = await getPrisma().media.create({
      data: { ...CAMPOS_OBRIGATORIOS, titleRomaji: "Berserk", anilistId: 30002, kitsuId: 8 },
    });

    expect([media.anilistId, media.kitsuId]).toEqual([30002, 8]);
  });

  it("RECUSA obra sem nenhuma identidade externa", async function ()
  {
    await expect(
      getPrisma().media.create({ data: CAMPOS_OBRIGATORIOS }),
    ).rejects.toThrow();
  });

  it("cada identidade continua unica", async function ()
  {
    const prisma = getPrisma();
    await prisma.media.create({ data: { ...CAMPOS_OBRIGATORIOS, kitsuId: 54598 } });

    await expect(
      prisma.media.create({ data: { ...CAMPOS_OBRIGATORIOS, kitsuId: 54598 } }),
    ).rejects.toThrow();
  });
});
