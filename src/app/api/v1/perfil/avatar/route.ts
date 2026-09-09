/**
 * PUT /api/v1/perfil/avatar — a foto do dono da sessão, corpo binário com o
 * Content-Type da imagem (issue #76). DELETE remove. Tipo e tamanho são
 * decididos no serviço.
 *
 * O corpo é lido em pedaços e cortado no primeiro que passar do limite (#148,
 * item 3). Antes a pré-checagem era `Number(content-length ?? 0)`, que vale 0
 * sem o cabeçalho e NaN com lixo: os dois passam pela comparação, e o corpo
 * inteiro era bufferizado antes de o serviço recusar. Na Vercel o teto da
 * plataforma limitava o excesso; num `next start` self-hosted não havia teto
 * nenhum. O controle nunca foi burlado — avatar grande jamais foi gravado —,
 * mas a memória era gasta à toa.
 */
import { NextResponse } from "next/server";
import { LIMITE_DO_AVATAR_BYTES } from "@/server/domain/avatar";
import {
  definirAvatarDoSistema,
  removerAvatarDoSistema,
} from "@/server/services/avatar.service";
import { ERRO } from "../../_shared/erros";
import { usuarioDaSessao } from "../../_shared/sessao";

export const dynamic = "force-dynamic";

export async function PUT(request: Request)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json({ erros: { _geral: ERRO.SESSAO_NECESSARIA } }, { status: 401 });
  }

  // Cabeçalho ausente ou com lixo é "desconhecido", não zero: a leitura por
  // pedaços é quem decide de verdade.
  const declarado = Number(request.headers.get("content-length"));

  if (Number.isFinite(declarado) && declarado > LIMITE_DO_AVATAR_BYTES)
  {
    return NextResponse.json({ erros: { _geral: ERRO.ARQUIVO_GRANDE_DEMAIS } }, { status: 413 });
  }

  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();

  try
  {
    const corpo = await lerAteOLimite(request);

    if (corpo === "grande_demais")
    {
      return NextResponse.json({ erros: { _geral: ERRO.ARQUIVO_GRANDE_DEMAIS } }, { status: 413 });
    }

    const resultado = await definirAvatarDoSistema({ userId, mime, bytes: corpo });

    if (resultado.estado === "invalido")
    {
      return NextResponse.json(
        {
          erros: {
            _geral: resultado.motivo === "tamanho_invalido"
              ? ERRO.ARQUIVO_GRANDE_DEMAIS
              : ERRO.TIPO_DE_ARQUIVO_INVALIDO,
          },
        },
        { status: resultado.motivo === "tamanho_invalido" ? 413 : 415 },
      );
    }

    if (resultado.estado === "limitado")
    {
      return NextResponse.json(
        { erros: { _geral: ERRO.LIMITE_EXCEDIDO } },
        { status: 429, headers: { "Retry-After": String(resultado.esperarSegundos) } },
      );
    }

    return NextResponse.json({ versao: resultado.versao }, { status: 200 });
  }
  catch (erro)
  {
    console.error("[perfil] falha ao salvar avatar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erros: { _geral: ERRO.FALHA_INTERNA } }, { status: 500 });
  }
}

export async function DELETE()
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    return NextResponse.json({ erros: { _geral: ERRO.SESSAO_NECESSARIA } }, { status: 401 });
  }

  try
  {
    await removerAvatarDoSistema({ userId });

    return new NextResponse(null, { status: 204 });
  }
  catch (erro)
  {
    console.error("[perfil] falha ao remover avatar:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erros: { _geral: ERRO.FALHA_INTERNA } }, { status: 500 });
  }
}

/**
 * Lê o corpo em pedaços e desiste no primeiro que passar do limite, cancelando
 * a leitura em vez de acumular o resto (#148, item 3).
 */
async function lerAteOLimite(request: Request): Promise<Uint8Array | "grande_demais">
{
  const corpo = request.body;

  if (corpo === null)
  {
    return new Uint8Array();
  }

  const leitor = corpo.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;

  for (;;)
  {
    const { done, value } = await leitor.read();

    if (done)
    {
      break;
    }

    total += value.byteLength;

    if (total > LIMITE_DO_AVATAR_BYTES)
    {
      await leitor.cancel();
      return "grande_demais";
    }

    pedacos.push(value);
  }

  const bytes = new Uint8Array(total);
  let posicao = 0;

  for (const pedaco of pedacos)
  {
    bytes.set(pedaco, posicao);
    posicao += pedaco.byteLength;
  }

  return bytes;
}
