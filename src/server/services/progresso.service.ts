/**
 * Caso de uso: abrir um capítulo — o clique que faz o progresso existir.
 *
 * O client manda no máximo o número do capítulo; a URL é resolvida AQUI, pelo
 * template confirmado. URL forjada pelo client não entra no histórico. O
 * progresso da estante só avança quando o capítulo aberto é o maior (regra no
 * domínio); releitura vira histórico e nada mais.
 */
import {
  progrideEstante,
  proximoCapitulo,
  tipoDaFonte,
  urlDaLeitura,
  urlDaPagina,
} from "@/server/domain/progresso";
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
  ) => Promise<{ entradaId: string; mediaId: string; progressChapter: string | null } | null>;
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
  }) => Promise<{ id: string }>;
  registrarReleitura: (dados: {
    userId: string;
    mediaId: string;
    readingSourceId: string;
    chapter: number;
    resolvedUrl: string;
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

  const maior = await deps.maiorCapitulo(pedido.userId, entrada.mediaId);
  const capitulo = pedido.capitulo ?? proximoCapitulo(maior);

  if (!Number.isFinite(capitulo) || capitulo <= 0)
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

  const registro = {
    userId: pedido.userId,
    mediaId: entrada.mediaId,
    readingSourceId: fonte.id,
    chapter: capitulo,
    resolvedUrl: url,
  };

  if (progrideEstante(maior, capitulo))
  {
    await deps.registrarComProgresso({ ...registro, novoProgresso: capitulo });

    return { estado: "ok", url, capitulo, progresso: capitulo };
  }

  await deps.registrarReleitura(registro);

  return { estado: "ok", url, capitulo, progresso: maior ?? capitulo };
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
