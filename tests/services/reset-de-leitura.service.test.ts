import { describe, expect, it, vi } from "vitest";
import {
  resetarLeitura,
  type DependenciasDoReset,
} from "@/server/services/reset-de-leitura.service";

// O desfazer da extensao (#172, parte 2): apaga o historico da obra e zera o
// progresso marcado, numa transacao so — o progresso e o MAIOR entre os dois,
// entao apagar um lado sem o outro nao corrige nada. Privado do dono: entrada
// alheia e inexistente sao o mesmo `nao_encontrada`.

function fakeDeps(cenario: { entrada?: { entradaId: string; mediaId: string } | null; removidas?: number } = {})
{
  const buscarEntrada = vi.fn(async function ()
  {
    return cenario.entrada === undefined ? { entradaId: "e1", mediaId: "m1" } : cenario.entrada;
  });
  const apagarHistoricoEZerar = vi.fn(async function ()
  {
    return { removidas: cenario.removidas ?? 7 };
  });

  const deps: DependenciasDoReset = { buscarEntrada, apagarHistoricoEZerar };

  return { deps, buscarEntrada, apagarHistoricoEZerar };
}

describe("resetarLeitura", function ()
{
  it("apaga o historico da obra E zera o progresso marcado, na mesma chamada", async function ()
  {
    const { deps, buscarEntrada, apagarHistoricoEZerar } = fakeDeps({ removidas: 7 });

    const resultado = await resetarLeitura({ userId: "u1", entradaId: "e1" }, deps);

    expect(buscarEntrada).toHaveBeenCalledExactlyOnceWith("u1", "e1");
    // A transacao recebe o userId: nenhuma abertura de outro usuario entra.
    expect(apagarHistoricoEZerar).toHaveBeenCalledExactlyOnceWith("u1", "m1");
    expect(resultado).toEqual({ estado: "ok", removidas: 7 });
  });

  it("entrada alheia ou inexistente e nao_encontrada, sem tocar o historico", async function ()
  {
    const { deps, apagarHistoricoEZerar } = fakeDeps({ entrada: null });

    const resultado = await resetarLeitura({ userId: "u1", entradaId: "de-outro" }, deps);

    expect(resultado).toEqual({ estado: "nao_encontrada" });
    expect(apagarHistoricoEZerar).not.toHaveBeenCalled();
  });

  it("obra sem abertura nenhuma ainda e ok: zerar a marcacao manual tambem e reset", async function ()
  {
    const { deps } = fakeDeps({ removidas: 0 });

    const resultado = await resetarLeitura({ userId: "u1", entradaId: "e1" }, deps);

    expect(resultado).toEqual({ estado: "ok", removidas: 0 });
  });
});
