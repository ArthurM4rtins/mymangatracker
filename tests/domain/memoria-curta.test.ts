import { describe, expect, it, vi } from "vitest";
import { lembrarPorChave, lembrarPorTempo } from "@/server/domain/memoria-curta";

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

// #134: similares e autor são leituras ao vivo do AniList, e o id vem da URL.
// Memo de valor único não serve (a chave muda), e Map sem teto vira crescimento
// sem limite escolhido por quem visita — daí o descarte do mais antigo.
describe("lembrarPorChave", function ()
{
  it("dentro da janela, chama uma vez por chave", async function ()
  {
    const fn = vi.fn(async function (id: number) { return `obra ${id}`; });
    const lembrada = lembrarPorChave(fn, 30000, 10, function () { return 1000; });

    await lembrada(1);
    await lembrada(1);
    await lembrada(2);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("depois da janela, busca de novo", async function ()
  {
    let agora = 1000;
    const fn = vi.fn(async function (id: number) { return `obra ${id}`; });
    const lembrada = lembrarPorChave(fn, 30000, 10, function () { return agora; });

    await lembrada(1);
    agora += 30001;
    await lembrada(1);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("acima do teto, descarta a chave mais antiga", async function ()
  {
    const fn = vi.fn(async function (id: number) { return `obra ${id}`; });
    const lembrada = lembrarPorChave(fn, 30000, 2, function () { return 1000; });

    await lembrada(1);
    await lembrada(2);
    await lembrada(3);

    // A 1 saiu para a 3 entrar; a 2 continua lembrada.
    await lembrada(2);
    expect(fn).toHaveBeenCalledTimes(3);

    await lembrada(1);
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("falha não é lembrada, e não ocupa vaga", async function ()
  {
    const fn = vi
      .fn<(id: number) => Promise<string>>()
      .mockRejectedValueOnce(new Error("fora"))
      .mockResolvedValue("ok");
    const lembrada = lembrarPorChave(fn, 30000, 10, function () { return 1000; });

    await expect(lembrada(1)).rejects.toThrow("fora");
    await expect(lembrada(1)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("chamadas concorrentes na mesma chave compartilham a promessa", async function ()
  {
    const fn = vi.fn(async function (id: number) { return `obra ${id}`; });
    const lembrada = lembrarPorChave(fn, 30000, 10, function () { return 1000; });

    await Promise.all([lembrada(7), lembrada(7), lembrada(7)]);

    expect(fn).toHaveBeenCalledOnce();
  });
});
