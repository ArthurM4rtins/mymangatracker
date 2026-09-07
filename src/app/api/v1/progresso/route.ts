/**
 * POST /api/v1/progresso — abre um capítulo: registra a abertura e devolve a
 * URL resolvida pelo template confirmado. O client manda no máximo o número do
 * capítulo — a URL nasce no servidor, URL forjada não entra no histórico.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { abrirCapituloDoSistema } from "@/server/services/progresso.service";
import { ERRO } from "../_shared/erros";
import { usuarioDaSessao } from "../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  entradaId: z.string().min(1),
  // Decimal com até 2 casas: capítulo 57.5 existe. Máximo do Decimal(8,2).
  // Decimal(8,2): duas casas, senão o banco arredonda o que a resposta afirmou.
  capitulo: z.number().positive().max(999999.99).multipleOf(0.01).optional(),
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

  let corpo: unknown;
  try
  {
    corpo = await request.json();
  }
  catch
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.CORPO_INVALIDO } },
      { status: 400 },
    );
  }

  const analise = ESQUEMA.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.PEDIDO_INVALIDO } },
      { status: 400 },
    );
  }

  try
  {
    const resultado = await abrirCapituloDoSistema({
      userId,
      entradaId: analise.data.entradaId,
      capitulo: analise.data.capitulo,
    });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.ENTRADA_NAO_ENCONTRADA } },
        { status: 404 },
      );
    }

    if (resultado.estado === "sem_fonte")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.SEM_FONTE } },
        { status: 409 },
      );
    }

    if (resultado.estado === "capitulo_invalido")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.CAPITULO_INVALIDO } },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        url: resultado.url,
        capitulo: resultado.capitulo,
        progresso: resultado.progresso,
      },
      { status: 200 },
    );
  }
  catch (erro)
  {
    console.error("[progresso] falha ao abrir:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
