/**
 * POST /api/v1/fontes/candidatos — deriva candidatos a template do link do
 * capítulo 1. Não grava nada: é a pré-visualização que a tela mostra para o
 * usuário confirmar.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { candidatosDeFonte } from "@/server/services/fonte.service";
import { usuarioDaSessao } from "../../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  url: z.string().min(1).max(2000),
});

export async function POST(request: Request)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json(
      { erros: { _geral: "entre para configurar a leitura" } },
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

  const resultado = candidatosDeFonte(analise.data.url);

  if (resultado.estado === "url_invalida")
  {
    return NextResponse.json(
      { erros: { url: "cole a URL completa do capítulo 1, com https://" } },
      { status: 422 },
    );
  }

  return NextResponse.json({ candidatos: resultado.candidatos }, { status: 200 });
}
