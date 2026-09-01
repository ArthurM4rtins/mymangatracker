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

export const dynamic = "force-dynamic";

const ESQUEMA_CADASTRO = z.object({
  username: z
    .string()
    .min(3, "no mínimo 3 caracteres")
    .max(30, "no máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_.-]+$/, "só letras, números, ponto, hífen e underline"),
  email: z.email("e-mail inválido").max(254),
  senha: z
    .string()
    .min(8, "no mínimo 8 caracteres")
    .max(72, "no máximo 72 caracteres"),
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
    const usuario = await cadastrarUsuarioNoSistema(analise.data);
    return NextResponse.json({ usuario }, { status: 201 });
  }
  catch (erro)
  {
    if (erro instanceof ErroCampoDuplicado)
    {
      return NextResponse.json(
        { erros: { [erro.campo]: "já está em uso" } },
        { status: 409 },
      );
    }

    // Detalhe de banco não entra no corpo — quem precisa olha o log da plataforma.
    console.error("[usuarios] falha ao cadastrar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json(
      { erros: { _geral: "não foi possível concluir o cadastro agora" } },
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
