/**
 * POST /api/v1/progresso — abre um capítulo: registra a abertura e devolve a
 * URL resolvida pelo template confirmado. O client manda no máximo o número do
 * capítulo — a URL nasce no servidor, URL forjada não entra no histórico.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { abrirCapituloDoSistema } from "@/server/services/progresso.service";
import { usuarioDaSessao } from "../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  entradaId: z.string().min(1),
  // Decimal com até 2 casas: capítulo 57.5 existe. Máximo do Decimal(8,2).
  capitulo: z.number().positive().max(999999.99).optional(),
});

export async function POST(request: Request)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json(
      { erros: { _geral: "entre para registrar a leitura" } },
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
      { erros: { _geral: "corpo inválido — esperado JSON" } },
      { status: 400 },
    );
  }

  const analise = ESQUEMA.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: "pedido inválido" } },
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
        { erros: { _geral: "entrada não encontrada" } },
        { status: 404 },
      );
    }

    if (resultado.estado === "sem_fonte")
    {
      return NextResponse.json(
        { erros: { _geral: "configure a fonte de leitura primeiro" } },
        { status: 409 },
      );
    }

    if (resultado.estado === "capitulo_invalido")
    {
      return NextResponse.json(
        { erros: { _geral: "capítulo inválido" } },
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
      { erros: { _geral: "não foi possível registrar agora" } },
      { status: 500 },
    );
  }
}
