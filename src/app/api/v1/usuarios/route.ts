/**
 * POST /api/v1/usuarios — criar conta.
 *
 * Controller: valida com Zod, delega ao serviço, traduz erro de domínio em
 * status HTTP. A resposta é o DTO público — o passwordHash não existe neste
 * contrato, e a senha recebida não é logada em caminho nenhum.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroCampoDuplicado } from "@/server/domain/erros";
import { cadastrarUsuarioNoSistema } from "@/server/services/cadastro.service";
import { limitarCadastro } from "@/server/services/limite.service";
import { lerJson } from "../_shared/corpo";
import { mesmaOrigem } from "../_shared/origem";
import { ERRO } from "../_shared/erros";
import { ipDoPedido } from "../_shared/ip";

export const dynamic = "force-dynamic";

// As mensagens aqui são código do catálogo, não frase: o 400 de validação
// devolve `questao.message` cru por campo, e quem escolhe o texto é a tela.
const ESQUEMA_CADASTRO = z.object({
  username: z
    .string()
    .min(3, ERRO.USERNAME_CURTO)
    .max(30, ERRO.USERNAME_LONGO)
    .regex(/^[a-zA-Z0-9_.-]+$/, ERRO.USERNAME_CARACTERES),
  email: z.email(ERRO.EMAIL_INVALIDO).max(254, ERRO.EMAIL_INVALIDO),
  senha: z
    .string()
    .min(8, ERRO.SENHA_CURTA)
    .max(72, ERRO.SENHA_LONGA),
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

  const analise = ESQUEMA_CADASTRO.safeParse(corpo);

  if (!analise.success)
  {
    return NextResponse.json(
      { erros: errosPorCampo(analise.error) },
      { status: 400 },
    );
  }

  try
  {
    // Cadastro em massa (#108) e enumeração de e-mail por 409 (#113) param aqui.
    const limite = await limitarCadastro({ ip: ipDoPedido(request) });

    if (limite.bloqueado)
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LIMITE_EXCEDIDO } },
        { status: 429, headers: { "Retry-After": String(limite.esperarSegundos) } },
      );
    }

    const usuario = await cadastrarUsuarioNoSistema(analise.data);
    return NextResponse.json({ usuario }, { status: 201 });
  }
  catch (erro)
  {
    if (erro instanceof ErroCampoDuplicado)
    {
      return NextResponse.json(
        { erros: { [erro.campo]: ERRO.JA_EM_USO } },
        { status: 409 },
      );
    }

    // Detalhe de banco não entra no corpo — quem precisa olha o log da plataforma.
    console.error("[usuarios] falha ao cadastrar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: ERRO.FALHA_INTERNA } },
      { status: 500 },
    );
  }
}

function errosPorCampo(erro: z.ZodError): Record<string, string>
{
  const erros: Record<string, string> = {};

  for (const questao of erro.issues)
  {
    const campo = String(questao.path[0] ?? "_geral");
    if (!(campo in erros))
    {
      erros[campo] = questao.message;
    }
  }

  return erros;
}
