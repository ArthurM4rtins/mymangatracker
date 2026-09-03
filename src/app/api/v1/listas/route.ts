/**
 * GET /api/v1/listas?anilistId=N — as listas do usuário logado, com o
 * "já contém" da obra (dropdown da página da obra).
 * POST /api/v1/listas — criar lista.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  criarListaDoSistema,
  minhasListasDoSistema,
} from "@/server/services/lista.service";
import { usuarioDaSessao } from "../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA_CRIACAO = z.object({
  nome: z.string().min(1).max(100),
  descricao: z.string().max(2000).nullable().optional(),
});

export async function GET(request: Request)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json(
      { erros: { _geral: "entre para usar listas" } },
      { status: 401 },
    );
  }

  const bruto = new URL(request.url).searchParams.get("anilistId");
  const anilistId = bruto === null ? null : Number(bruto);

  if (anilistId !== null && (!Number.isInteger(anilistId) || anilistId <= 0))
  {
    return NextResponse.json(
      { erros: { _geral: "anilistId inválido" } },
      { status: 400 },
    );
  }

  try
  {
    const listas = await minhasListasDoSistema(userId, anilistId);

    return NextResponse.json({ listas }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[listas] falha ao listar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível agora" } },
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
      { erros: { _geral: "entre para criar listas" } },
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

  const analise = ESQUEMA_CRIACAO.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: "nome de 1 a 100 caracteres" } },
      { status: 400 },
    );
  }

  try
  {
    const resultado = await criarListaDoSistema({
      userId,
      nome: analise.data.nome,
      descricao: analise.data.descricao ?? null,
    });

    if (resultado.estado === "lista_invalida")
    {
      return NextResponse.json(
        { erros: { _geral: "nome de 1 a 100 caracteres" } },
        { status: 422 },
      );
    }

    return NextResponse.json({ listaId: resultado.listaId }, { status: 201 });
  }
  catch (erro)
  {
    console.error("[listas] falha ao criar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível agora" } },
      { status: 500 },
    );
  }
}
