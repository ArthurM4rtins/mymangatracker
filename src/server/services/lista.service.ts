/**
 * Casos de uso das listas (issue #41): criar, apagar e alternar obra (toggle
 * a partir da página da obra). Quem resolve a sessão é o controller.
 */
import { mesmoConjunto } from "@/server/domain/lista-ordem";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import { limitarLista, limitarOrdem } from "./limite.service";
import { buscarMediaPorAnilistId } from "@/server/repositories/media.repository";
import {
  adicionarItem,
  alternarCurtidaDaLista,
  apagarLista,
  buscarListaComItens,
  criarLista,
  editarLista,
  listarItensParaOrdem,
  listarListasPublicas,
  listarMinhasListas,
  removerItem,
  reordenarItens,
  type ListaComItens,
  type ListaPublica,
  buscarNomeDaLista,
} from "@/server/repositories/lista.repository";

import type { OrdemDasListas } from "@/server/domain/lista-listagem";

const NOME_MAXIMO = 100;

export type DependenciasDeCriacao = {
  criar: (dados: {
    userId: string;
    nome: string;
    descricao: string | null;
  }) => Promise<{ id: string }>;
  /** Teto de listas por usuário na janela (#136). */
  limitar: (userId: string) => Promise<Veredito>;
};

export async function criarListaDoUsuario(
  pedido: { userId: string; nome: string; descricao: string | null },
  deps: DependenciasDeCriacao,
): Promise<
  | { estado: "ok"; listaId: string }
  | { estado: "lista_invalida" }
  | { estado: "limitado"; esperarSegundos: number }
>
{
  const nome = pedido.nome.trim();
  const descricao = pedido.descricao?.trim() || null;

  if (nome === "" || nome.length > NOME_MAXIMO)
  {
    return { estado: "lista_invalida" };
  }

  const limite = await deps.limitar(pedido.userId);

  if (limite.bloqueado)
  {
    return { estado: "limitado", esperarSegundos: limite.esperarSegundos };
  }

  const criada = await deps.criar({ userId: pedido.userId, nome, descricao });

  return { estado: "ok", listaId: criada.id };
}

export type DependenciasDeToggle = {
  buscarMedia: (anilistId: number) => Promise<{ id: string } | null>;
  adicionar: (
    userId: string,
    listaId: string,
    mediaId: string,
  ) => Promise<{ jaExistia: boolean } | { cheia: true } | null>;
  remover: (
    userId: string,
    listaId: string,
    mediaId: string,
  ) => Promise<{ removido: true } | null>;
};

/**
 * Toggle: obra fora entra, obra dentro sai. A obra precisa existir no cache —
 * quem chega aqui veio da página da obra, então ela já foi cacheada.
 */
export async function alternarObraNaLista(
  pedido: { userId: string; listaId: string; anilistId: number },
  deps: DependenciasDeToggle,
): Promise<
  | { estado: "ok"; contem: boolean }
  | { estado: "nao_encontrada" }
  | { estado: "obra_desconhecida" }
  | { estado: "lista_cheia" }
>
{
  const media = await deps.buscarMedia(pedido.anilistId);

  if (media === null)
  {
    return { estado: "obra_desconhecida" };
  }

  const adicionado = await deps.adicionar(pedido.userId, pedido.listaId, media.id);

  if (adicionado === null)
  {
    return { estado: "nao_encontrada" };
  }

  if ("cheia" in adicionado)
  {
    return { estado: "lista_cheia" };
  }

  if (!adicionado.jaExistia)
  {
    return { estado: "ok", contem: true };
  }

  await deps.remover(pedido.userId, pedido.listaId, media.id);

  return { estado: "ok", contem: false };
}

/**
 * Remover é um verbo próprio, idempotente na intenção: numa página
 * desatualizada, "remover" nunca pode virar "adicionar" (#65, item 9).
 * `nao_encontrada` cobre lista alheia/inexistente e obra que já não estava.
 */
export async function removerObraDaLista(
  pedido: { userId: string; listaId: string; anilistId: number },
  deps: Pick<DependenciasDeToggle, "buscarMedia" | "remover">,
): Promise<
  | { estado: "ok" }
  | { estado: "nao_encontrada" }
  | { estado: "obra_desconhecida" }
>
{
  const media = await deps.buscarMedia(pedido.anilistId);

  if (media === null)
  {
    return { estado: "obra_desconhecida" };
  }

  const removido = await deps.remover(pedido.userId, pedido.listaId, media.id);

  return removido === null ? { estado: "nao_encontrada" } : { estado: "ok" };
}

/** A composição de produção. */
export function criarListaDoSistema(pedido: {
  userId: string;
  nome: string;
  descricao: string | null;
})
{
  return criarListaDoUsuario(pedido, {
    criar: criarLista,
    limitar: function (userId) { return limitarLista({ userId }); },
  });
}

/** A composição de produção. */
export function alternarObraNaListaDoSistema(pedido: {
  userId: string;
  listaId: string;
  anilistId: number;
})
{
  return alternarObraNaLista(pedido, {
    buscarMedia: buscarMediaPorAnilistId,
    adicionar: adicionarItem,
    remover: removerItem,
  });
}

/** A composição de produção. */
export function removerObraDaListaDoSistema(pedido: {
  userId: string;
  listaId: string;
  anilistId: number;
})
{
  return removerObraDaLista(pedido, {
    buscarMedia: buscarMediaPorAnilistId,
    remover: removerItem,
  });
}

const LIMITE_DE_LISTAS_PUBLICAS = 30;

/** A composição de produção. As listas de todo mundo, na ordem pedida (issue #80). */
export function listasPublicasDoSistema(ordem: OrdemDasListas = "recentes"): Promise<ListaPublica[]>
{
  return listarListasPublicas(LIMITE_DE_LISTAS_PUBLICAS, ordem);
}

/** A composição de produção. A lista com as obras, para a página dela. */
export function listaComItensDoSistema(
  listaId: string,
  userId: string | null,
): Promise<ListaComItens | null>
{
  return buscarListaComItens(listaId, userId);
}

/**
 * A composição de produção. As listas do usuário para o dropdown da página da
 * obra — `jaContem` marcado quando o anilistId veio e a obra está no cache.
 */
export async function minhasListasDoSistema(
  userId: string,
  anilistId: number | null,
): Promise<Array<{ listaId: string; nome: string; jaContem: boolean }>>
{
  const media =
    anilistId === null ? null : await buscarMediaPorAnilistId(anilistId);

  return listarMinhasListas(userId, media?.id ?? null);
}

/** A composição de produção. Apagar é repasse direto — a posse decide no banco. */
export async function apagarListaDoSistema(pedido: {
  userId: string;
  listaId: string;
}): Promise<{ estado: "ok" } | { estado: "nao_encontrada" }>
{
  const removida = await apagarLista(pedido.userId, pedido.listaId);

  return removida === null ? { estado: "nao_encontrada" } : { estado: "ok" };
}

// ---- Evolução (issue #51): editar, reordenar, curtir ----

export type DependenciasDeEdicao = {
  editar: (
    userId: string,
    listaId: string,
    campos: { nome: string; descricao: string | null },
  ) => Promise<{ editada: true } | null>;
};

/** Mesma regra da criação: nome 1–100 após trim, descrição em branco vira null. */
export async function editarListaDoUsuario(
  pedido: { userId: string; listaId: string; nome: string; descricao: string | null },
  deps: DependenciasDeEdicao,
): Promise<{ estado: "ok" } | { estado: "lista_invalida" } | { estado: "nao_encontrada" }>
{
  const nome = pedido.nome.trim();
  const descricao = pedido.descricao?.trim() || null;

  if (nome === "" || nome.length > NOME_MAXIMO)
  {
    return { estado: "lista_invalida" };
  }

  const editada = await deps.editar(pedido.userId, pedido.listaId, { nome, descricao });

  return editada === null ? { estado: "nao_encontrada" } : { estado: "ok" };
}

export type DependenciasDeOrdem = {
  listarItens: (
    userId: string,
    listaId: string,
  ) => Promise<Array<{ anilistId: number; mediaId: string }> | null>;
  reordenar: (
    userId: string,
    listaId: string,
    mediaIds: string[],
  ) => Promise<{ reordenada: true } | null>;
  limitar: (userId: string) => Promise<Veredito>;
};

/**
 * A ordem proposta (por anilistId) tem que ser permutação exata dos itens
 * atuais — o domínio decide. Só então traduz para mediaId e grava.
 *
 * O teto por usuário (#146) corre antes de tudo: reordenar reescreve a lista
 * inteira, e sem limite o único freio era a latência de quem pedia. Pedido
 * bloqueado não custa nem a leitura dos itens.
 */
export async function reordenarItensDaLista(
  pedido: { userId: string; listaId: string; anilistIds: number[] },
  deps: DependenciasDeOrdem,
): Promise<
  | { estado: "ok" }
  | { estado: "ordem_invalida" }
  | { estado: "nao_encontrada" }
  | { estado: "muitos_pedidos"; esperarSegundos: number }
>
{
  const limite = await deps.limitar(pedido.userId);

  if (limite.bloqueado)
  {
    return { estado: "muitos_pedidos", esperarSegundos: limite.esperarSegundos };
  }

  const atuais = await deps.listarItens(pedido.userId, pedido.listaId);

  if (atuais === null)
  {
    return { estado: "nao_encontrada" };
  }

  const atuaisIds = atuais.map(function (item) { return item.anilistId; });

  if (!mesmoConjunto(atuaisIds, pedido.anilistIds))
  {
    return { estado: "ordem_invalida" };
  }

  const porAnilistId = new Map(atuais.map(function (item) { return [item.anilistId, item.mediaId]; }));
  const mediaIds = pedido.anilistIds.map(function (anilistId)
  {
    return porAnilistId.get(anilistId) as string;
  });

  const gravada = await deps.reordenar(pedido.userId, pedido.listaId, mediaIds);

  return gravada === null ? { estado: "nao_encontrada" } : { estado: "ok" };
}

export type DependenciasDeCurtidaDeLista = {
  alternar: (
    listaId: string,
    userId: string,
  ) => Promise<{ curtida: boolean; total: number } | null>;
};

export async function curtirLista(
  pedido: { userId: string; listaId: string },
  deps: DependenciasDeCurtidaDeLista,
): Promise<
  | { estado: "ok"; curtida: boolean; total: number }
  | { estado: "nao_encontrada" }
>
{
  const resultado = await deps.alternar(pedido.listaId, pedido.userId);

  if (resultado === null)
  {
    return { estado: "nao_encontrada" };
  }

  return { estado: "ok", curtida: resultado.curtida, total: resultado.total };
}

/** A composição de produção. */
export function editarListaDoSistema(pedido: {
  userId: string;
  listaId: string;
  nome: string;
  descricao: string | null;
})
{
  return editarListaDoUsuario(pedido, { editar: editarLista });
}

/** A composição de produção. */
export function reordenarItensDoSistema(pedido: {
  userId: string;
  listaId: string;
  anilistIds: number[];
})
{
  return reordenarItensDaLista(pedido, {
    listarItens: listarItensParaOrdem,
    reordenar: reordenarItens,
    limitar: function (userId) { return limitarOrdem({ userId }); },
  });
}

/** A composição de produção. */
export function curtirListaDoSistema(pedido: { userId: string; listaId: string })
{
  return curtirLista(pedido, { alternar: alternarCurtidaDaLista });
}

/** Só o nome da lista, para metadata (#135): não carrega os itens duas vezes por visita. */
export function nomeDaListaDoSistema(listaId: string): Promise<string | null>
{
  return buscarNomeDaLista(listaId);
}
