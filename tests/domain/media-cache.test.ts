import { describe, expect, it } from "vitest";
import { cacheEstaFresco, TTL_DO_CACHE_MS } from "@/server/domain/media-cache";

// A regra da issue #10: dentro de 24h o cache vale e o AniList não é chamado.

const AGORA = new Date("2026-08-31T12:00:00Z");

describe("cacheEstaFresco", function ()
{
  it("sincronizado agora mesmo é fresco", function ()
  {
    expect(cacheEstaFresco(AGORA, AGORA)).toBe(true);
  });

  it("sincronizado 23h59 atrás ainda é fresco", function ()
  {
    const quaseUmDia = new Date(AGORA.getTime() - (TTL_DO_CACHE_MS - 60_000));

    expect(cacheEstaFresco(quaseUmDia, AGORA)).toBe(true);
  });

  it("sincronizado exatamente 24h atrás já venceu", function ()
  {
    const umDia = new Date(AGORA.getTime() - TTL_DO_CACHE_MS);

    expect(cacheEstaFresco(umDia, AGORA)).toBe(false);
  });

  it("sincronizado no futuro (relógio torto) é tratado como fresco", function ()
  {
    const futuro = new Date(AGORA.getTime() + 60_000);

    expect(cacheEstaFresco(futuro, AGORA)).toBe(true);
  });
});
