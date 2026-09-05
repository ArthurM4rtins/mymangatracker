import { describe, expect, it, vi } from "vitest";
import { lembrarPorTempo } from "@/server/domain/memoria-curta";

// #65, item 26: /api/v1/health é público e cada chamada disparava uma
// requisição real ao AniList, cota compartilhada por todos os usuários. A
// sonda passa a ser lembrada por alguns segundos.
describe("lembrarPorTempo", function ()
{
  it("dentro da janela, chama a função uma vez só", async function ()
  {
    let agora = 1000;
    const fn = vi.fn(async function () { return "ok" as const; });
    const lembrada = lembrarPorTempo(fn, 30000, function () { return agora; });

    await lembrada();
    agora += 10000;
    await lembrada();

    expect(fn).toHaveBeenCalledOnce();
  });

  it("passada a janela, chama de novo", async function ()
  {
    let agora = 1000;
    const fn = vi.fn(async function () { return "ok" as const; });
    const lembrada = lembrarPorTempo(fn, 30000, function () { return agora; });

    await lembrada();
    agora += 30001;
    await lembrada();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("falha não é lembrada — a próxima chamada tenta de novo", async function ()
  {
    const fn = vi
      .fn<() => Promise<"ok">>()
      .mockRejectedValueOnce(new Error("fora"))
      .mockResolvedValue("ok");
    const lembrada = lembrarPorTempo(fn, 30000, function () { return 1000; });

    await expect(lembrada()).rejects.toThrow("fora");
    await expect(lembrada()).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("chamadas concorrentes compartilham a mesma promessa", async function ()
  {
    const fn = vi.fn(async function () { return "ok" as const; });
    const lembrada = lembrarPorTempo(fn, 30000, function () { return 1000; });

    await Promise.all([lembrada(), lembrada(), lembrada()]);

    expect(fn).toHaveBeenCalledOnce();
  });
});
