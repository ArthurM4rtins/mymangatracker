/**
 * PATCH /api/v1/perfil — preferências da conta. Hoje, só o idioma da interface
 * (#116, fase 5).
 *
 * DELETE /api/v1/perfil — apaga a conta (#208). Irreversível: leva tudo em
 * cascata e libera o nome de usuário na hora.
 *
 * Controller: valida com Zod, resolve a sessão, delega. Quem sabe QUAIS idiomas
 * o site tem é esta camada, que enxerga o `routing.locales`; o serviço só checa
 * a forma do código.
 *
 * A resposta escreve o cookie `NEXT_LOCALE` junto: a pessoa troca o idioma e o
 * proxy já respeita na navegação seguinte, sem precisar entrar de novo.
 */
import { hasLocale } from "next-intl";
import { NextResponse } from "next/server";
import { z } from "zod";

import { routing } from "@/i18n/routing";
import { apagarContaDoSistema } from "@/server/services/conta.service";
import { salvarIdiomaDoSistema } from "@/server/services/idioma.service";

import { lerJson } from "../_shared/corpo";
import { ERRO } from "../_shared/erros";
import { apagarSessaoDoCookie, escreverIdiomaNoCookie, usuarioDaSessao } from "../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA_PREFERENCIAS = z.object({
  locale: z.string().min(2).max(35),
});

const ESQUEMA_EXCLUSAO = z.object({
  confirmacao: z.string().min(1).max(60),
});

export async function PATCH(request: Request)
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

  const analise = ESQUEMA_PREFERENCIAS.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.PEDIDO_INVALIDO } },
      { status: 400 },
    );
  }

  const { locale } = analise.data;

  // Idioma que o site não tem é recusado aqui, não gravado: uma coluna com
  // valor estranho faria o layout devolver 404 no login seguinte da pessoa.
  if (!hasLocale(routing.locales, locale))
  {
    return NextResponse.json(
      { erros: { locale: ERRO.IDIOMA_INVALIDO } },
      { status: 422 },
    );
  }

  try
  {
    const resultado = await salvarIdiomaDoSistema({ userId, locale });

    if (resultado.estado === "idioma_invalido")
    {
      return NextResponse.json(
        { erros: { locale: ERRO.IDIOMA_INVALIDO } },
        { status: 422 },
      );
    }

    const resposta = NextResponse.json({ locale }, { status: 200 });
    escreverIdiomaNoCookie(resposta, locale);

    return resposta;
  }
  catch (erro)
  {
    console.error("[perfil] falha ao salvar idioma:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}

/**
 * Apaga a conta de quem está logado. A confirmação vem no corpo e é comparada
 * com o username do banco, no serviço — o cliente não escolhe os dois lados.
 *
 * O cookie é apagado na resposta. Não é o que revoga a sessão (o token já
 * morre porque o usuário não tem mais versão), é para o navegador não ficar
 * carregando um cookie que não vale mais.
 */
export async function DELETE(request: Request)
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

  const analise = ESQUEMA_EXCLUSAO.safeParse(leitura.corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.PEDIDO_INVALIDO } },
      { status: 400 },
    );
  }

  try
  {
    const resultado = await apagarContaDoSistema({
      userId,
      confirmacao: analise.data.confirmacao,
    });

    if (resultado.estado === "muitos_pedidos")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LIMITE_EXCEDIDO } },
        { status: 429, headers: { "Retry-After": String(resultado.esperarSegundos) } },
      );
    }

    if (resultado.estado === "confirmacao_invalida")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.CONFIRMACAO_INVALIDA } },
        { status: 422 },
      );
    }

    if (resultado.estado === "nao_encontrada")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.SESSAO_NECESSARIA } },
        { status: 401 },
      );
    }

    const resposta = NextResponse.json({ ok: true }, { status: 200 });
    apagarSessaoDoCookie(resposta);

    return resposta;
  }
  catch (erro)
  {
    console.error("[perfil] falha ao apagar conta:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}
