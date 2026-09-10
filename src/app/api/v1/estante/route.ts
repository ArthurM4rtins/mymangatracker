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
import { lerJson } from "../_shared/corpo";
import { ERRO } from "../_shared/erros";
import { usuarioDaSessao } from "../_shared/sessao";
import { referenciaDaChave } from "@/server/domain/referencia-da-obra";

export const dynamic = "force-dynamic";

const STATUS = z.enum(["READING", "COMPLETED", "PLANNED", "PAUSED", "DROPPED"]);

const ESQUEMA_ESTANTE = z.object({
  // A obra pela chave (#254): `anilist:30002` ou `kitsu:54598`.
  obra: z.string().min(3).max(40),
  status: STATUS.default("PLANNED"),
});

export async function GET(request: Request)
{
  // A extensão lê a estante por Bearer (#52); é uma das duas rotas que aceitam (#137).
  const userId = await usuarioDaSessao({ aceitarBearer: true });

  if (!userId)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.SESSAO_NECESSARIA } },
      { status: 401 },
    );
  }

  const statusBruto = new URL(request.url).searchParams.get("status");
  const analise = STATUS.optional().safeParse(statusBruto ?? undefined);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.STATUS_INVALIDO } },
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

  const analise = ESQUEMA_ESTANTE.safeParse(corpo);

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
    const resultado = await adicionarNaEstanteDoSistema({
      userId,
      referencia,
      status: analise.data.status,
    });

    if (resultado.estado === "obra_desconhecida")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.OBRA_FORA_DO_CATALOGO } },
        { status: 404 },
      );
    }

    if (resultado.estado === "indisponivel")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.CATALOGO_INDISPONIVEL } },
        { status: 503 },
      );
    }

    if (resultado.estado === "limitado")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LIMITE_EXCEDIDO } },
        { status: 429, headers: { "Retry-After": String(resultado.esperarSegundos) } },
      );
    }

    return NextResponse.json({ ok: true, entradaId: resultado.entradaId }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[estante] falha ao adicionar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
