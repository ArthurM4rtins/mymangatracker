/**
 * GET /api/v1/catalogo — uma página do catálogo, para o "ver mais" da tela.
 *
 * A página inicial vem renderizada pelo servidor; as seguintes chegam por aqui,
 * quando a pessoa pede. Mesmos filtros da URL do catálogo, mais `pagina`.
 *
 * Controller: valida, resolve sessão e IP, delega. O IP vai para o teto por
 * visitante da busca (#134) — página seguinte é busca como qualquer outra. A
 * resposta é DTO do contrato: só o que o card precisa, nunca a obra inteira.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { interpretarFiltros } from "@/server/domain/catalogo-filtros";
import {
  buscarNoCatalogo,
  obraParaDTO,
  type PaginaDoCatalogoDTO,
} from "@/server/services/catalogo.service";
import { anilistIdsNaEstanteDoSistema } from "@/server/services/estante.service";
import { ERRO } from "../_shared/erros";
import { ipDoPedido } from "../_shared/ip";
import { usuarioDaSessao } from "../_shared/sessao";

export const dynamic = "force-dynamic";

/** Cinquenta páginas de 36 são 1.800 obras: mais que isso é robô, não leitor. */
const ESQUEMA = z.object({
  pagina: z.coerce.number().int().min(1).max(50).default(1),
});

export async function GET(request: Request)
{
  const url = new URL(request.url);
  const analise = ESQUEMA.safeParse({ pagina: url.searchParams.get("pagina") ?? "1" });

  if (!analise.success)
  {
    return NextResponse.json({ erros: { _geral: ERRO.PEDIDO_INVALIDO } }, { status: 400 });
  }

  const filtro = interpretarFiltros(Object.fromEntries(url.searchParams));

  try
  {
    const [resultado, userId] = await Promise.all([
      buscarNoCatalogo(filtro, undefined, ipDoPedido(request), analise.data.pagina),
      usuarioDaSessao(),
    ]);

    const naEstante = userId === null
      ? new Set<number>()
      : new Set(await anilistIdsNaEstanteDoSistema(userId).catch(function (): number[] { return []; }));

    const obras = "obras" in resultado
      ? resultado.obras.map(function (obra) { return obraParaDTO(obra, naEstante); })
      : [];

    const corpo: PaginaDoCatalogoDTO = {
      estado: resultado.estado,
      obras,
      // Quem sabe se há mais é a fonte, não a contagem do que sobrou depois do
      // descarte do domínio (#228).
      temMais: "temMais" in resultado && resultado.temMais,
    };

    return NextResponse.json(corpo, {
      status: resultado.estado === "muitos_pedidos" ? 429 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
  catch (erro)
  {
    console.error("[catalogo] falha ao paginar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erros: { _geral: ERRO.FALHA_INTERNA } }, { status: 500 });
  }
}
