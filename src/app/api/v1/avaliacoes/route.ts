import { referenciaDaChave } from "@/server/domain/referencia-da-obra";
/**
 * POST /api/v1/avaliacoes — salvar (criar ou editar) a avaliação de uma
 * entrada da estante. Nota e/ou resenha; vazia não existe.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { salvarAvaliacaoDoSistema } from "@/server/services/avaliacao.service";
import { lerJson } from "../_shared/corpo";
import { ERRO } from "../_shared/erros";
import { usuarioDaSessao } from "../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  /** A obra pela chave (#254): `anilist:30002` ou `kitsu:54598`. */
  obra: z.string().min(3).max(40),
  rating: z.number().nullable(),
  review: z.string().max(20000).nullable(),
  containsSpoilers: z.boolean().default(false),
});

export async function POST(request: Request)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.SESSAO_NECESSARIA } },
      { status: 401 },
    );
  }

  const leitura = await lerJson(request);

  if (!leitura.ok)
  {
    return leitura.resposta;
  }

  const corpo: unknown = leitura.corpo;

  const analise = ESQUEMA.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.PEDIDO_INVALIDO } },
      { status: 400 },
    );
  }

  // A chave chega do corpo: nada nela e de confianca (#254).
  const referencia = referenciaDaChave(analise.data.obra);

  if (referencia === null)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.PEDIDO_INVALIDO } },
      { status: 400 },
    );
  }

  try
  {
    const resultado = await salvarAvaliacaoDoSistema({
      userId,
      referencia,
      rating: analise.data.rating,
      review: analise.data.review,
      containsSpoilers: analise.data.containsSpoilers,
    });

    if (resultado.estado === "muitos_pedidos")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LIMITE_EXCEDIDO } },
        { status: 429, headers: { "Retry-After": String(resultado.esperarSegundos) } },
      );
    }

    if (resultado.estado === "obra_desconhecida")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.OBRA_NAO_ENCONTRADA } },
        { status: 404 },
      );
    }

    if (resultado.estado === "avaliacao_invalida")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.AVALIACAO_INVALIDA } },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[avaliacoes] falha ao salvar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
