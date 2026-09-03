/**
 * POST /api/v1/sessao — entrar. DELETE /api/v1/sessao — sair.
 *
 * Controller: valida com Zod, delega ao serviço, escreve/apaga o cookie. A
 * resposta de credencial inválida é UMA só — não diz se o e-mail existe.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { entrarNoSistema } from "@/server/services/sessao.service";
import {
  apagarSessaoDoCookie,
  escreverSessaoNoCookie,
} from "../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA_LOGIN = z.object({
  email: z.email("e-mail inválido").max(254),
  senha: z.string().min(1, "informe a senha").max(72),
});

export async function POST(request: Request)
{
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

  const analise = ESQUEMA_LOGIN.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: "e-mail ou senha incorretos" } },
      { status: 400 },
    );
  }

  try
  {
    const sessao = await entrarNoSistema(analise.data);

    if (!sessao)
    {
      return NextResponse.json(
        { erros: { _geral: "e-mail ou senha incorretos" } },
        { status: 401 },
      );
    }

    const resposta = NextResponse.json({ ok: true }, { status: 200 });
    escreverSessaoNoCookie(resposta, sessao.token);
    return resposta;
  }
  catch (erro)
  {
    // SESSION_SECRET ausente ou banco fora. O detalhe fica no log — a senha
    // nunca é logada, nem aqui.
    console.error("[sessao] falha ao entrar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível entrar agora" } },
      { status: 500 },
    );
  }
}

export async function DELETE()
{
  // Sair apaga o cookie de fato — maxAge 0 — não só redireciona.
  const resposta = NextResponse.json({ ok: true }, { status: 200 });
  apagarSessaoDoCookie(resposta);
  return resposta;
}
