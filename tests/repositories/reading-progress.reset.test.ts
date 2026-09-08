import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  apagarHistoricoEZerarProgresso,
  contarAberturas,
  maiorCapitulo,
  registrarAbertura,
} from "@/server/repositories/reading-progress.repository";
import { getPrisma } from "@/server/repositories/prisma";
import { limparBanco, semearMedia, semearUsuario } from "./apoio";

// O reset de leitura (#172) e a primeira exclusao de ReadingProgress do
// sistema. Duas coisas so se provam no banco: que a transacao zera TAMBEM o
// capitulo marcado a mao (o progresso e o maior dos dois), e que nenhuma
// abertura de outro usuario sai junto.

async function semearEntrada(userId: string, mediaId: string, progressChapter: number | null)
{
  return getPrisma().shelfEntry.create({
    data: { userId, mediaId, status: "READING", progressChapter },
    select: { id: true },
  });
}

describe("reset de leitura", () =>
{
  beforeEach(async () =>
  {
    await limparBanco();
  });

  afterAll(async () =>
  {
    await getPrisma().$disconnect();
  });

  it("apaga o historico da obra e zera o capitulo marcado, na mesma transacao", async () =>
  {
    const leitor = await semearUsuario("leitor");
    const media = await semearMedia(1);
    const entrada = await semearEntrada(leitor.id, media.id, 100);

    for (const chapter of [1, 57.5, 94])
    {
      await registrarAbertura({
        userId: leitor.id,
        mediaId: media.id,
        chapter,
        resolvedUrl: `https://site.test/c/${chapter}`,
      });
    }

    const resultado = await apagarHistoricoEZerarProgresso(leitor.id, media.id);

    expect(resultado).toEqual({ removidas: 3 });
    expect(await contarAberturas(leitor.id, media.id)).toBe(0);
    expect(await maiorCapitulo(leitor.id, media.id)).toBeNull();

    const depois = await getPrisma().shelfEntry.findUnique({
      where: { id: entrada.id },
      select: { progressChapter: true, status: true },
    });
    // Marcado a mao em 100: sem zerar isto, o progresso continuaria em 100.
    expect(depois?.progressChapter).toBeNull();
    // Resetar nao e abandonar.
    expect(depois?.status).toBe("READING");
  });

  it("nao toca nas aberturas de outro usuario nem de outra obra", async () =>
  {
    const alice = await semearUsuario("alice");
    const bob = await semearUsuario("bob");
    const berserk = await semearMedia(1);
    const vagabond = await semearMedia(2);
    await semearEntrada(alice.id, berserk.id, 10);
    const deBob = await semearEntrada(bob.id, berserk.id, 999);

    await registrarAbertura({ userId: alice.id, mediaId: berserk.id, chapter: 10, resolvedUrl: "https://site.test/a/10" });
    await registrarAbertura({ userId: alice.id, mediaId: vagabond.id, chapter: 94, resolvedUrl: "https://site.test/a/94" });
    await registrarAbertura({ userId: bob.id, mediaId: berserk.id, chapter: 999, resolvedUrl: "https://site.test/b/999" });

    const resultado = await apagarHistoricoEZerarProgresso(alice.id, berserk.id);

    expect(resultado).toEqual({ removidas: 1 });
    expect(await contarAberturas(alice.id, vagabond.id)).toBe(1);
    expect(await contarAberturas(bob.id, berserk.id)).toBe(1);

    const bobDepois = await getPrisma().shelfEntry.findUnique({
      where: { id: deBob.id },
      select: { progressChapter: true },
    });
    expect(bobDepois?.progressChapter?.toString()).toBe("999");
  });

  it("obra sem abertura: remove zero e ainda zera a marcacao", async () =>
  {
    const leitor = await semearUsuario("leitor");
    const media = await semearMedia(1);
    const entrada = await semearEntrada(leitor.id, media.id, 42);

    expect(await apagarHistoricoEZerarProgresso(leitor.id, media.id)).toEqual({ removidas: 0 });

    const depois = await getPrisma().shelfEntry.findUnique({
      where: { id: entrada.id },
      select: { progressChapter: true },
    });
    expect(depois?.progressChapter).toBeNull();
  });
});
