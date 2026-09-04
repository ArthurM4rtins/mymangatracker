/**
 * Caso de uso: abrir um capítulo — o clique que faz o progresso existir.
 *
 * O client manda no máximo o número do capítulo; a URL é resolvida AQUI, pelo
 * template confirmado. URL forjada pelo client não entra no histórico. O
 * progresso da estante só avança quando o capítulo aberto é o maior (regra no
 * domínio); releitura vira histórico e nada mais.
 */
import type { StatusDaEstante } from "@/server/domain/perfil";
import {
  capituloValido,
  progressoAtual,
  progrideEstante,
  proximoCapitulo,
  tipoDaFonte,
  urlDaLeitura,
  urlDaPagina,
} from "@/server/domain/progresso";
import { statusAposLeitura } from "@/server/domain/status-de-leitura";
import { buscarEntradaDoUsuario } from "@/server/repositories/shelf.repository";
import { buscarFonteAtiva } from "@/server/repositories/reading-source.repository";
import {
  maiorCapitulo,
  registrarAbertura,
  registrarAberturaComProgresso,
} from "@/server/repositories/reading-progress.repository";

export type PedidoDeAbertura = {
  userId: string;
  entradaId: string;
  /** Ausente = o próximo capítulo depois do maior lido. */
  capitulo?: number;
};

export type ResultadoDeAbertura =
  | { estado: "ok"; url: string; capitulo: number; progresso: number }
  | { estado: "nao_encontrada" }
  | { estado: "sem_fonte" }
  | { estado: "capitulo_invalido" };

export type DependenciasDeAbertura = {
  buscarEntrada: (
    userId: string,
    entradaId: string,
  ) => Promise<{
    entradaId: string;
    mediaId: string;
    progressChapter: string | null;
    status: StatusDaEstante;
  } | null>;
  buscarFonte: (
    userId: string,
    mediaId: string,
  ) => Promise<{ id: string; sourceHost: string; urlTemplate: string } | null>;
  maiorCapitulo: (userId: string, mediaId: string) => Promise<number | null>;
  registrarComProgresso: (dados: {
    userId: string;
    mediaId: string;
    readingSourceId: string;
    chapter: number;
    resolvedUrl: string;
    novoProgresso: number;
    novoStatus?: StatusDaEstante;
  }) => Promise<{ id: string }>;
  registrarReleitura: (dados: {
    userId: string;
    mediaId: string;
    readingSourceId: string;
    chapter: number;
    resolvedUrl: string;
    novoStatus?: StatusDaEstante;
  }) => Promise<{ id: string }>;
};

export async function abrirCapitulo(
  pedido: PedidoDeAbertura,
  deps: DependenciasDeAbertura,
): Promise<ResultadoDeAbertura>
{
  const entrada = await deps.buscarEntrada(pedido.userId, pedido.entradaId);

  if (entrada === null)
  {
    return { estado: "nao_encontrada" };
  }

  const fonte = await deps.buscarFonte(pedido.userId, entrada.mediaId);

  if (fonte === null)
  {
    return { estado: "sem_fonte" };
  }

  // O progresso vale o maior entre o capítulo marcado à mão na estante e o
  // maior aberto no histórico (#61) — a tela promete "Continuar cap. N+1" a
  // partir do marcado, e o clique tem que cumprir sem regredir a estante.
  const maior = await deps.maiorCapitulo(pedido.userId, entrada.mediaId);
  const marcado = entrada.progressChapter === null ? null : Number(entrada.progressChapter);
  const atual = progressoAtual(marcado, maior);
  const capitulo = pedido.capitulo ?? proximoCapitulo(atual);

  if (!capituloValido(capitulo))
  {
    return { estado: "capitulo_invalido" };
  }

  // Fonte de página da obra (site sem número na URL): abre a página da série
  // e o registro do capítulo continua idêntico ao do template.
  let url: string;
  try
  {
    url =
      tipoDaFonte(fonte.urlTemplate) === "template"
        ? urlDaLeitura(fonte.sourceHost, fonte.urlTemplate, capitulo)
        : urlDaPagina(fonte.sourceHost, fonte.urlTemplate);
  }
  catch
  {
    return { estado: "capitulo_invalido" };
  }

  // Abrir capítulo diz que a pessoa está lendo: obra Planejada, pausada ou
  // largada volta a Lendo; concluída não é desmarcada. Mesma regra do domínio
  // que a extensão usa, para os dois caminhos não divergirem.
  const novoStatus = statusAposLeitura(entrada.status);

  const registro = {
    userId: pedido.userId,
    mediaId: entrada.mediaId,
    readingSourceId: fonte.id,
    chapter: capitulo,
    resolvedUrl: url,
    ...(novoStatus !== null && { novoStatus }),
  };

  if (progrideEstante(atual, capitulo))
  {
    await deps.registrarComProgresso({ ...registro, novoProgresso: capitulo });

    return { estado: "ok", url, capitulo, progresso: capitulo };
  }

  await deps.registrarReleitura(registro);

  return { estado: "ok", url, capitulo, progresso: atual ?? capitulo };
}

/** A composição de produção. */
export function abrirCapituloDoSistema(
  pedido: PedidoDeAbertura,
): Promise<ResultadoDeAbertura>
{
  return abrirCapitulo(pedido, {
    buscarEntrada: buscarEntradaDoUsuario,
    buscarFonte: buscarFonteAtiva,
    maiorCapitulo,
    registrarComProgresso: registrarAberturaComProgresso,
    registrarReleitura: registrarAbertura,
  });
}
