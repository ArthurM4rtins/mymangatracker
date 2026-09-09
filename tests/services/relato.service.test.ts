import { describe, expect, it, vi } from "vitest";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import { enviarRelato } from "@/server/services/relato.service";

// #158: so quem esta logado envia (decisao de 09/09), o teto reaproveita o
// limitador que ja existe, e canal sem credencial DIZ que esta fora em vez de
// engolir o relato.

const PEDIDO = {
  userId: "u1",
  username: "leitora",
  texto: "em espanhol, 'largo' foi usado como 'grande'",
  sugestao: "",
  rota: "/es/catalogo",
  idioma: "es",
};

function fakeDeps(overrides = {})
{
  return {
    limitar: vi.fn(async function (): Promise<Veredito> { return { bloqueado: false }; }),
    publicar: vi.fn(async function () { return { estado: "ok" as const, url: "https://exemplo/1" }; }),
    ...overrides,
  };
}

describe("enviarRelato", function ()
{
  it("publica e devolve o link", async function ()
  {
    const deps = fakeDeps();

    await expect(enviarRelato(PEDIDO, deps)).resolves.toEqual({
      estado: "ok",
      url: "https://exemplo/1",
    });
  });

  it("texto vazio e recusado sem gastar o teto nem chamar o GitHub", async function ()
  {
    const deps = fakeDeps();

    await expect(enviarRelato({ ...PEDIDO, texto: "   " }, deps)).resolves.toEqual({
      estado: "relato_invalido",
    });
    expect(deps.limitar).not.toHaveBeenCalled();
    expect(deps.publicar).not.toHaveBeenCalled();
  });

  it("acima do teto nao publica", async function ()
  {
    const deps = fakeDeps({
      limitar: vi.fn(async function (): Promise<Veredito>
      {
        return { bloqueado: true, esperarSegundos: 60 };
      }),
    });

    await expect(enviarRelato(PEDIDO, deps)).resolves.toEqual({
      estado: "muitos_pedidos",
      esperarSegundos: 60,
    });
    expect(deps.publicar).not.toHaveBeenCalled();
  });

  it("canal sem credencial diz que esta fora — nao engole o relato", async function ()
  {
    const deps = fakeDeps({
      publicar: vi.fn(async function () { return { estado: "nao_configurado" as const }; }),
    });

    await expect(enviarRelato(PEDIDO, deps)).resolves.toEqual({ estado: "indisponivel" });
  });

  it("falha do GitHub tambem vira indisponivel, sem vazar detalhe", async function ()
  {
    const deps = fakeDeps({
      publicar: vi.fn(async function () { return { estado: "falhou" as const }; }),
    });

    await expect(enviarRelato(PEDIDO, deps)).resolves.toEqual({ estado: "indisponivel" });
  });

  it("o teto e por usuario", async function ()
  {
    const deps = fakeDeps();

    await enviarRelato(PEDIDO, deps);

    expect(deps.limitar).toHaveBeenCalledWith("u1");
  });
});
