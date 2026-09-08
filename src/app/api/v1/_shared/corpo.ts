/**
 * Leitura do corpo JSON com a guarda que faltava (#131): só entra
 * `application/json`. Um form cross-site consegue mandar qualquer corpo, mas
 * nunca com esse `content-type` — o navegador só permite `text/plain`,
 * `multipart` e `urlencoded` sem CORS, e o app não responde
 * `Access-Control-Allow-*`. Exigir o tipo certo mata o vetor `enctype=text/plain`
 * em TODA rota que lê JSON, não só no login.
 *
 * Camada de controller. Substitui o `try { await request.json() } catch` que
 * cada rota repetia à mão.
 */
import { NextResponse } from "next/server";
import { ERRO } from "./erros";

export type CorpoLido =
  | { ok: true; corpo: unknown }
  | { ok: false; resposta: NextResponse };

export async function lerJson(request: Request): Promise<CorpoLido>
{
  const tipo = request.headers.get("content-type") ?? "";

  if (!tipo.toLowerCase().startsWith("application/json"))
  {
    return {
      ok: false,
      resposta: NextResponse.json(
        { erros: { _geral: ERRO.CONTEUDO_NAO_JSON } },
        { status: 415 },
      ),
    };
  }

  try
  {
    return { ok: true, corpo: await request.json() };
  }
  catch
  {
    return {
      ok: false,
      resposta: NextResponse.json(
        { erros: { _geral: ERRO.CORPO_INVALIDO } },
        { status: 400 },
      ),
    };
  }
}
