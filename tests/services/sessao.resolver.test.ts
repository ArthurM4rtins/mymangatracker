import { describe, expect, it, vi } from "vitest";
import {
  resolverSessao,
  sair,
  type DependenciasDoResolver,
} from "@/server/services/sessao.service";

// Sair revoga (#137): o token carrega `ver`, o banco guarda `tokenVersion`, e a
// sessao so existe quando os dois batem. A comparacao mora AQUI, no servico —
// infra nao le repositorio, e controller nao contem regra.

function deps(cenario: { noToken?: { userId: string; versao: number } | null; noBanco?: number | null })
{
  const verificar = vi.fn(async function ()
  {
    return cenario.noToken === undefined ? { userId: "u1", versao: 2 } : cenario.noToken;
  });
  const buscarVersao = vi.fn(async function ()
  {
    return cenario.noBanco === undefined ? 2 : cenario.noBanco;
  });
  const d: DependenciasDoResolver = { verificar, buscarVersao };

  return { d, verificar, buscarVersao };
}

describe("resolverSessao", function ()
{
  it("versao do token igual a do banco: a sessao vale e devolve o userId", async function ()
  {
    const { d, verificar, buscarVersao } = deps({});

    await expect(resolverSessao("tok", d)).resolves.toBe("u1");
    expect(verificar).toHaveBeenCalledExactlyOnceWith("tok");
    expect(buscarVersao).toHaveBeenCalledExactlyOnceWith("u1");
  });

  it("versao do token menor que a do banco: e o token de quem ja saiu — null", async function ()
  {
    const { d } = deps({ noToken: { userId: "u1", versao: 1 }, noBanco: 2 });

    await expect(resolverSessao("tok", d)).resolves.toBeNull();
  });

  it("token invalido ou expirado e null sem consultar o banco", async function ()
  {
    const { d, buscarVersao } = deps({ noToken: null });

    await expect(resolverSessao("tok", d)).resolves.toBeNull();
    expect(buscarVersao).not.toHaveBeenCalled();
  });

  it("usuario que nao existe mais e null", async function ()
  {
    const { d } = deps({ noBanco: null });

    await expect(resolverSessao("tok", d)).resolves.toBeNull();
  });

  it("token antigo sem ver conta como 0: ninguem e derrubado pelo deploy", async function ()
  {
    // A infra ja traduz ausencia de `ver` em 0; aqui 0 == 0 no banco recem-migrado.
    const { d } = deps({ noToken: { userId: "u1", versao: 0 }, noBanco: 0 });

    await expect(resolverSessao("tok", d)).resolves.toBe("u1");
  });
});

describe("sair", function ()
{
  it("incrementa a versao do usuario: todo token assinado antes morre", async function ()
  {
    const incrementarVersao = vi.fn(async function () {});

    await sair("u1", { incrementarVersao });

    expect(incrementarVersao).toHaveBeenCalledExactlyOnceWith("u1");
  });
});
