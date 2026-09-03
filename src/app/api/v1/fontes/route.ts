/**
 * POST /api/v1/fontes — confirma a fonte de leitura de uma entrada da estante.
 * Troca a ativa preservando o histórico. Entrada alheia responde 404, igual à
 * inexistente — fonte é privada do dono.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmarFonteDoSistema } from "@/server/services/fonte.service";
import { usuarioDaSessao } from "../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  entradaId: z.string().min(1),
  sourceHost: z.string().min(1).max(255),
  urlTemplate: z.string().min(1).max(2000),
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

  try
  {
    const resultado = await confirmarFonteDoSistema({
      userId,
      entradaId: analise.data.entradaId,
      sourceHost: analise.data.sourceHost,
      urlTemplate: analise.data.urlTemplate,
    });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: "entrada não encontrada" } },
        { status: 404 },
      );
    }

    if (resultado.estado === "template_invalido")
    {
      return NextResponse.json(
        { erros: { _geral: "template inválido — refaça a derivação" } },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[fontes] falha ao confirmar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível salvar agora" } },
      { status: 500 },
    );
  }
}
