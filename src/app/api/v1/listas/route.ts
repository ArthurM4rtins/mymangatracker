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
import { lerJson } from "../_shared/corpo";
import { ERRO } from "../_shared/erros";
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
      { erros: { _geral: ERRO.SESSAO_NECESSARIA } },
      { status: 401 },
    );
  }

  const bruto = new URL(request.url).searchParams.get("anilistId");
  const anilistId = bruto === null ? null : Number(bruto);

  if (anilistId !== null && (!Number.isInteger(anilistId) || anilistId <= 0))
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.ANILIST_ID_INVALIDO } },
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
      { erros: { _geral: ERRO.FALHA_INTERNA } },
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

  const analise = ESQUEMA_CRIACAO.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.NOME_INVALIDO } },
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
        { erros: { _geral: ERRO.NOME_INVALIDO } },
        { status: 422 },
      );
    }

    if (resultado.estado === "limitado")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LIMITE_EXCEDIDO } },
        { status: 429, headers: { "Retry-After": String(resultado.esperarSegundos) } },
      );
    }

    return NextResponse.json({ listaId: resultado.listaId }, { status: 201 });
  }
  catch (erro)
  {
    console.error("[listas] falha ao criar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
