/**
 * GET /api/v1/estante — listar a estante do usuário, com ?status= opcional.
 * POST /api/v1/estante — adicionar/atualizar uma obra na estante.
 *
 * Controller: resolve a sessão (só aqui), valida com Zod, delega ao serviço.
 * Sem sessão é 401 — estante é privada por definição.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adicionarNaEstanteDoSistema,
  listarEstanteDoSistema,
} from "@/server/services/estante.service";
import { usuarioDaSessao } from "../_shared/sessao";

export const dynamic = "force-dynamic";

const STATUS = z.enum(["READING", "COMPLETED", "PLANNED", "PAUSED", "DROPPED"]);

const ESQUEMA_ESTANTE = z.object({
  anilistId: z.number().int().positive(),
  status: STATUS.default("PLANNED"),
});

export async function GET(request: Request)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json(
      { erros: { _geral: "entre para usar a estante" } },
      { status: 401 },
    );
  }

  const statusBruto = new URL(request.url).searchParams.get("status");
  const analise = STATUS.optional().safeParse(statusBruto ?? undefined);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: "status inválido" } },
      { status: 400 },
    );
  }

  try
  {
    const entradas = await listarEstanteDoSistema({
      userId,
      status: analise.data,
    });

    return NextResponse.json({ entradas }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[estante] falha ao listar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível carregar a estante agora" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json(
      { erros: { _geral: "entre para usar a estante" } },
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

  const analise = ESQUEMA_ESTANTE.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: "pedido inválido" } },
      { status: 400 },
    );
  }

  try
  {
    const resultado = await adicionarNaEstanteDoSistema({
      userId,
      anilistId: analise.data.anilistId,
      status: analise.data.status,
    });

    if (resultado.estado === "obra_desconhecida")
    {
      return NextResponse.json(
        { erros: { _geral: "obra não encontrada no catálogo" } },
        { status: 404 },
      );
    }

    if (resultado.estado === "indisponivel")
    {
      return NextResponse.json(
        { erros: { _geral: "catálogo indisponível agora — tente de novo" } },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true, entradaId: resultado.entradaId }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[estante] falha ao adicionar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível salvar agora" } },
      { status: 500 },
    );
  }
}
