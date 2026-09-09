/**
 * POST /api/v1/relatos — relato de erro de tradução (issue #158).
 *
 * Só com sessão (decisão de 09/09/2026): cada envio vira issue pública no
 * repositório, então anônimo convidaria spam. O controller resolve a sessão e o
 * username; quem monta e publica o texto é o serviço.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { TAMANHO_MAXIMO_DO_RELATO } from "@/server/domain/relato-de-traducao";
import { enviarRelatoDoSistema } from "@/server/services/relato.service";
import { perfilDoUsuarioDoSistema } from "@/server/services/usuario.service";
import { lerJson } from "../_shared/corpo";
import { ERRO } from "../_shared/erros";
import { usuarioDaSessao } from "../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA = z.object({
  texto: z.string().min(1).max(TAMANHO_MAXIMO_DO_RELATO),
  sugestao: z.string().max(TAMANHO_MAXIMO_DO_RELATO).optional(),
  rota: z.string().max(200).optional(),
  idioma: z.string().max(10).optional(),
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

  const leitura = await lerJson(request);

  if (!leitura.ok)
  {
    return leitura.resposta;
  }

  const analise = ESQUEMA.safeParse(leitura.corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.PEDIDO_INVALIDO } },
      { status: 400 },
    );
  }

  try
  {
    const usuario = await perfilDoUsuarioDoSistema(userId);

    if (usuario === null)
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.SESSAO_NECESSARIA } },
        { status: 401 },
      );
    }

    const resultado = await enviarRelatoDoSistema({
      userId,
      username: usuario.username,
      texto: analise.data.texto,
      sugestao: analise.data.sugestao ?? "",
      rota: analise.data.rota ?? "",
      idioma: analise.data.idioma ?? "",
    });

    if (resultado.estado === "relato_invalido")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.PEDIDO_INVALIDO } },
        { status: 422 },
      );
    }

    if (resultado.estado === "muitos_pedidos")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LIMITE_EXCEDIDO } },
        { status: 429, headers: { "Retry-After": String(resultado.esperarSegundos) } },
      );
    }

    // Canal desligado ou GitHub fora: 503, e a tela diz para tentar depois. O
    // que não pode é responder 201 sem ter registrado nada.
    if (resultado.estado === "indisponivel")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.RELATO_INDISPONIVEL } },
        { status: 503 },
      );
    }

    return NextResponse.json({ url: resultado.url }, { status: 201 });
  }
  catch (erro)
  {
    console.error("[relatos] falha ao enviar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
