/**
 * POST /api/v1/sessao — entrar. DELETE /api/v1/sessao — sair.
 *
 * Controller: valida com Zod, delega ao serviço, escreve/apaga o cookie. A
 * resposta de credencial inválida é UMA só — não diz se o e-mail existe.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { entrarNoSistema } from "@/server/services/sessao.service";
import { liberarLogin, limitarLogin } from "@/server/services/limite.service";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { lerJson } from "../_shared/corpo";
import { mesmaOrigem } from "../_shared/origem";
import { ERRO } from "../_shared/erros";
import { ipDoPedido } from "../_shared/ip";
import {
  apagarSessaoDoCookie,
  escreverIdiomaNoCookie,
  escreverSessaoNoCookie,
} from "../_shared/sessao";

export const dynamic = "force-dynamic";

// Identificador é e-mail OU nome de usuário (#166), então o formato não é
// validado aqui: recusar "não parece e-mail" daria resposta diferente para
// entrada malformada, e o login responde igual para tudo que não entra. Quem
// decide qual dos dois é o domínio.
const ESQUEMA_LOGIN = z.object({
  identificador: z.string().min(1, "informe o e-mail ou nome de usuário").max(254),
  senha: z.string().min(1, "informe a senha").max(72),
});

export async function POST(request: Request)
{
  // CSRF (#131): esta rota grava cookie sem exigir cookie. Form de outro site
  // nao passa daqui; o corpo nem chega a ser lido.
  if (!mesmaOrigem(request))
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.ORIGEM_RECUSADA } },
      { status: 403 },
    );
  }

  const leitura = await lerJson(request);

  if (!leitura.ok)
  {
    return leitura.resposta;
  }

  const corpo: unknown = leitura.corpo;

  const analise = ESQUEMA_LOGIN.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.CREDENCIAIS_INVALIDAS } },
      { status: 400 },
    );
  }

  const ip = ipDoPedido(request);

  try
  {
    // Antes do scrypt: é o custo que o limite protege (#108).
    const limite = await limitarLogin({ ip, identificador: analise.data.identificador });

    if (limite.bloqueado)
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LIMITE_EXCEDIDO } },
        { status: 429, headers: { "Retry-After": String(limite.esperarSegundos) } },
      );
    }

    const sessao = await entrarNoSistema(analise.data);

    if (!sessao)
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.CREDENCIAIS_INVALIDAS } },
        { status: 401 },
      );
    }

    await liberarLogin({ ip, identificador: analise.data.identificador });

    const resposta = NextResponse.json({ ok: true }, { status: 200 });
    escreverSessaoNoCookie(resposta, sessao.token);

    // O idioma da conta vence a negociação a partir daqui (#116, fase 5). É o
    // login que escreve o cookie, e não o proxy que abre o JWT na borda: para
    // estar logada num aparelho novo a pessoa precisa entrar, e entrar já passa
    // por aqui. Conta que nunca escolheu idioma não escreve nada, e a
    // negociação por `Accept-Language` segue valendo.
    if (hasLocale(routing.locales, sessao.locale))
    {
      escreverIdiomaNoCookie(resposta, sessao.locale);
    }

    return resposta;
  }
  catch (erro)
  {
    // SESSION_SECRET ausente ou banco fora. O detalhe fica no log — a senha
    // nunca é logada, nem aqui.
    console.error("[sessao] falha ao entrar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
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
