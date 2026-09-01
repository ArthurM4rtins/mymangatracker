import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "@/server/repositories/prisma";
import {
  buscarMediaPorAnilistId,
  salvarMediaDoAniList,
} from "@/server/repositories/media.repository";
import { adicionarOuAtualizarEntrada } from "@/server/repositories/shelf.repository";
import { limparBanco, semearUsuario } from "./apoio";

// As regras de banco da issue #10: Media é upsert por anilistId (cache nunca
// duplica) e ShelfEntry é uma linha por (userId, mediaId) — adicionar de novo
// atualiza o status.

const OBRA = {
  anilistId: 30013,
  type: "MANGA" as const,
  titleRomaji: "Vinland Saga",
  chapters: 224,
};

beforeEach(limparBanco);

describe("salvarMediaDoAniList", function ()
{
  it("gravar duas vezes o mesmo anilistId mantém UMA linha, com syncedAt novo", async function ()
  {
    const primeira = new Date("2026-08-30T10:00:00Z");
    const segunda = new Date("2026-08-31T10:00:00Z");

    const a = await salvarMediaDoAniList(OBRA, primeira);
    const b = await salvarMediaDoAniList({ ...OBRA, chapters: 225 }, segunda);

    expect(b.id).toBe(a.id);
    expect(await getPrisma().media.count({ where: { anilistId: 30013 } })).toBe(1);

    const lido = await buscarMediaPorAnilistId(30013);
    expect(lido?.syncedAt).toEqual(segunda);
  });
});

describe("adicionarOuAtualizarEntrada", function ()
{
  it("adicionar duas vezes atualiza o status, não duplica", async function ()
  {
    const usuario = await semearUsuario("rankine");
    const media = await salvarMediaDoAniList(OBRA, new Date());

    const primeira = await adicionarOuAtualizarEntrada({
      userId: usuario.id,
      mediaId: media.id,
      status: "PLANNED",
    });
    const segunda = await adicionarOuAtualizarEntrada({
      userId: usuario.id,
      mediaId: media.id,
      status: "READING",
    });

    expect(segunda.id).toBe(primeira.id);

    const linhas = await getPrisma().shelfEntry.findMany({
      where: { userId: usuario.id, mediaId: media.id },
    });
    expect(linhas).toHaveLength(1);
    expect(linhas[0].status).toBe("READING");
  });

  it("a mesma obra em estantes de usuários diferentes são linhas separadas", async function ()
  {
    const um = await semearUsuario("um");
    const outro = await semearUsuario("outro");
    const media = await salvarMediaDoAniList(OBRA, new Date());

    await adicionarOuAtualizarEntrada({ userId: um.id, mediaId: media.id, status: "PLANNED" });
    await adicionarOuAtualizarEntrada({ userId: outro.id, mediaId: media.id, status: "PLANNED" });

    expect(await getPrisma().shelfEntry.count({ where: { mediaId: media.id } })).toBe(2);
  });
});
