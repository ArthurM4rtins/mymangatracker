/**
 * POST /api/v1/leitura — registra o capítulo que o usuário JÁ está lendo, a
 * partir da aba aberta. É a rota da extensão de navegador (issue #52).
 *
 * Irmã do `POST /api/v1/progresso`, e de propósito separada dela: lá o app abre
 * um capítulo e a URL nasce no servidor pelo template confirmado; aqui a fonte
 * não tem template, o usuário já está na página, e a URL gravada é a que ele
 * está lendo. Misturar as duas afrouxaria o contrato do `/progresso`, onde URL
 * vinda do client não entra no histórico.
 *
 * Controller: resolve a sessão (só aqui), valida a forma com Zod, delega. Faixa
 * do capítulo e esquema da URL são regra de domínio, não se repetem aqui.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { registrarLeituraExternaDoSistema } from "@/server/services/leitura-externa.service";
import { usuarioDaSessao } from "../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  entradaId: z.string().min(1),
  // Só a forma: quem diz se o número cabe no contrato é o domínio, que devolve
  // 422. O teto Decimal(8,2) mora em `domain/capitulo`, num lugar só.
  capitulo: z.number(),
  url: z.string().min(1),
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
    const resultado = await registrarLeituraExternaDoSistema({
      userId,
      entradaId: analise.data.entradaId,
      capitulo: analise.data.capitulo,
      urlVisitada: analise.data.url,
    });

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: "entrada não encontrada" } },
        { status: 404 },
      );
    }

    if (resultado.estado === "capitulo_invalido")
    {
      return NextResponse.json(
        { erros: { _geral: "capítulo inválido" } },
        { status: 422 },
      );
    }

    if (resultado.estado === "url_invalida")
    {
      return NextResponse.json(
        { erros: { _geral: "URL de leitura inválida" } },
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
    console.error("[leitura] falha ao registrar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível registrar agora" } },
      { status: 500 },
    );
  }
}
