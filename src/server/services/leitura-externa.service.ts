/**
 * Caso de uso: registrar a leitura da página que o usuário já está lendo — o
 * clique na extensão de navegador (issue #52).
 *
 * Diferença para `abrirCapitulo`: lá o app abre um capítulo e a URL nasce no
 * servidor pelo template confirmado. Aqui a fonte não tem template nenhum (é o
 * caso do MangaFire, do MangaDex e afins), o usuário já está na página, e a URL
 * gravada é a aba aberta. Por isso rota e caso de uso próprios, em vez de
 * afrouxar o contrato do `/progresso`, onde URL vinda do client não entra.
 *
 * O que NÃO muda: a regra do progresso continua sendo a do domínio — o maior
 * capítulo manda, releitura é histórico e não regride a estante.
 */
import { normalizarCapitulo } from "@/server/domain/capitulo";
import type { StatusDaEstante } from "@/server/domain/perfil";
import { progressoAtual, progrideEstante } from "@/server/domain/progresso";
import { statusAposLeitura } from "@/server/domain/status-de-leitura";
import { normalizarUrlVisitada } from "@/server/domain/url-visitada";
import { buscarEntradaDoUsuario } from "@/server/repositories/shelf.repository";
import {
  maiorCapitulo,
  registrarAbertura,
  registrarAberturaComProgresso,
} from "@/server/repositories/reading-progress.repository";

export type PedidoDeLeituraExterna = {
  userId: string;
  entradaId: string;
  /** O que o popup mostrou na tela: extraído do título da aba ou digitado. */
  capitulo: number;
  /** A aba que o usuário está lendo. */
  urlVisitada: string;
};

export type ResultadoDeLeituraExterna =
  | { estado: "ok"; capitulo: number; progresso: number; url: string }
  | { estado: "nao_encontrada" }
  | { estado: "capitulo_invalido" }
  | { estado: "url_invalida" };

export type DependenciasDeLeituraExterna = {
  buscarEntrada: (
    userId: string,
    entradaId: string,
  ) => Promise<{
    entradaId: string;
    mediaId: string;
    progressChapter: string | null;
    status: StatusDaEstante;
  } | null>;
  maiorCapitulo: (userId: string, mediaId: string) => Promise<number | null>;
  registrarComProgresso: (dados: {
    userId: string;
    mediaId: string;
    chapter: number;
    resolvedUrl: string;
    novoProgresso: number;
    novoStatus?: StatusDaEstante;
  }) => Promise<{ id: string }>;
  registrarReleitura: (dados: {
    userId: string;
    mediaId: string;
    chapter: number;
    resolvedUrl: string;
    novoStatus?: StatusDaEstante;
  }) => Promise<{ id: string }>;
};

export async function registrarLeituraExterna(
  pedido: PedidoDeLeituraExterna,
  deps: DependenciasDeLeituraExterna,
): Promise<ResultadoDeLeituraExterna>
{
  // As duas checagens puras vêm antes do banco: pedido malformado não vira I/O.
  const capitulo = normalizarCapitulo(pedido.capitulo);

  if (capitulo === null)
  {
    return { estado: "capitulo_invalido" };
  }

  const url = normalizarUrlVisitada(pedido.urlVisitada);

  if (url === null)
  {
    return { estado: "url_invalida" };
  }

  const entrada = await deps.buscarEntrada(pedido.userId, pedido.entradaId);

  if (entrada === null)
  {
    return { estado: "nao_encontrada" };
  }

  // O progresso vale o maior entre o marcado à mão na estante e o histórico
  // (#61) — a mesma regra do caminho do site.
  const maior = await deps.maiorCapitulo(pedido.userId, entrada.mediaId);
  const marcado = entrada.progressChapter === null ? null : Number(entrada.progressChapter);
  const atual = progressoAtual(marcado, maior);

  // Quem começou a obra que estava Planejada está lendo; quem concluiu não é
  // desmarcado. A regra é do domínio e vale igual no caminho do site.
  const novoStatus = statusAposLeitura(entrada.status);

  // Sem `readingSourceId`: a leitura externa é justamente o caso sem fonte
  // configurada. O progresso pertence à obra, não ao site.
  const registro = {
    userId: pedido.userId,
    mediaId: entrada.mediaId,
    chapter: capitulo,
    resolvedUrl: url,
    ...(novoStatus !== null && { novoStatus }),
  };

  if (progrideEstante(atual, capitulo))
  {
    await deps.registrarComProgresso({ ...registro, novoProgresso: capitulo });

    return { estado: "ok", capitulo, progresso: capitulo, url };
  }

  await deps.registrarReleitura(registro);

  return { estado: "ok", capitulo, progresso: atual ?? capitulo, url };
}

/** A composição de produção. */
export function registrarLeituraExternaDoSistema(
  pedido: PedidoDeLeituraExterna,
): Promise<ResultadoDeLeituraExterna>
{
  return registrarLeituraExterna(pedido, {
    buscarEntrada: buscarEntradaDoUsuario,
    maiorCapitulo,
    registrarComProgresso: registrarAberturaComProgresso,
    registrarReleitura: registrarAbertura,
  });
}
