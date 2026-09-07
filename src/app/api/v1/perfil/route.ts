/**
 * PATCH /api/v1/perfil — preferências da conta. Hoje, só o idioma da interface
 * (#116, fase 5).
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
import { salvarIdiomaDoSistema } from "@/server/services/idioma.service";

import { ERRO } from "../_shared/erros";
import { escreverIdiomaNoCookie, usuarioDaSessao } from "../_shared/sessao";

export const dynamic = "force-dynamic";

const ESQUEMA_PREFERENCIAS = z.object({
  locale: z.string().min(2).max(35),
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

  let corpo: unknown;
  try
  {
    corpo = await request.json();
  }
  catch
  {
    return NextResponse.json(
      { erros: { _geral: ERRO.CORPO_INVALIDO } },
      { status: 400 },
    );
  }

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
