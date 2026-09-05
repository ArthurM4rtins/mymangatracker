/**
 * GET  /api/v1/reviews/:entryId/comentarios?antesDe=<ISO> — página anterior da conversa.
 * POST /api/v1/reviews/:entryId/comentarios — comentar na resenha.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  comentarReviewDoSistema,
  comentariosAnterioresDaReviewDoSistema,
} from "@/server/services/review-social.service";
import { usuarioDaSessao } from "../../../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  texto: z.string().min(1).max(2000),
});

export async function POST(
  request: Request,
  contexto: { params: Promise<{ entryId: string }> },
)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json(
      { erros: { _geral: "entre para comentar" } },
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
      { erros: { _geral: "comentário inválido" } },
      { status: 400 },
    );
  }

  const { entryId } = await contexto.params;

  try
  {
    const resultado = await comentarReviewDoSistema({
      userId,
      entryId,
      texto: analise.data.texto,
    });

    if (resultado.estado === "muitos_comentarios")
    {
      return NextResponse.json(
        { erros: { _geral: "muitos comentários em pouco tempo — aguarde para continuar" } },
        { status: 429, headers: { "Retry-After": String(resultado.esperarSegundos) } },
      );
    }

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: "resenha não encontrada" } },
        { status: 404 },
      );
    }

    if (resultado.estado === "comentario_invalido")
    {
      return NextResponse.json(
        { erros: { _geral: "comentário vazio ou longo demais" } },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  }
  catch (erro)
  {
    console.error("[reviews] falha ao comentar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível agora" } },
      { status: 500 },
    );
  }
}

const ESQUEMA_DA_PAGINA = z.object({
  antesDe: z.iso.datetime(),
});

export async function GET(
  request: Request,
  contexto: { params: Promise<{ entryId: string }> },
)
{
  const analise = ESQUEMA_DA_PAGINA.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: "informe antesDe em ISO 8601" } },
      { status: 400 },
    );
  }

  const { entryId } = await contexto.params;
  // Comentário é público como a resenha; a sessão só marca "meu".
  const userId = await usuarioDaSessao();

  try
  {
    const comentarios = await comentariosAnterioresDaReviewDoSistema({
      entryId,
      antesDe: new Date(analise.data.antesDe),
      userId,
    });

    return NextResponse.json({ comentarios }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[reviews] falha ao paginar comentários:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível agora" } },
      { status: 500 },
    );
  }
}
