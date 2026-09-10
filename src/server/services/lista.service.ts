/**
 * Casos de uso das listas (issue #41): criar, apagar, adicionar e remover obra.
 * Quem resolve a sessão é o controller.
 */
import { mesmoConjunto } from "@/server/domain/lista-ordem";
import { podeSeRelacionar } from "@/server/domain/social";
import {
  FATOR_DE_BUSCA,
  MAXIMO_POR_AUTOR,
  noMaximoPorAutor,
} from "@/server/domain/rodizio-de-autoria";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { buscarMediaPorId } from "@/server/infra/anilist";
import { buscarNoKitsuPorAnilistId } from "@/server/infra/kitsu";
import { limitarItemDeLista, limitarLista, limitarOrdem } from "./limite.service";
import {
  buscarMediaPorAnilistId,
  salvarMediaDoAniList,
} from "@/server/repositories/media.repository";
import {
  adicionarItem,
  alternarCurtidaDaLista,
  apagarLista,
  buscarListaComItens,
  criarLista,
  donoDaLista,
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

export type DependenciasDeAdicao = {
  buscarMedia: (anilistId: number) => Promise<{ id: string } | null>;
  buscarNoAniList: (anilistId: number) => Promise<MediaDoAniList | null>;
  /** O degrau de baixo, só com o AniList fora (#219). */
  buscarNoKitsu: (anilistId: number) => Promise<MediaDoAniList | null>;
  salvarMedia: (obra: MediaDoAniList, sincronizadoEm: Date) => Promise<{ id: string }>;
  adicionar: (
    userId: string,
    listaId: string,
    mediaId: string,
  ) => Promise<{ jaExistia: boolean } | { cheia: true } | null>;
  /** Teto de itens por usuário na janela. Antes do AniList: é I/O de terceiro. */
  limitar: (userId: string) => Promise<Veredito>;
  relogio?: () => Date;
};

export type DependenciasDeRemocao = {
  buscarMedia: (anilistId: number) => Promise<{ id: string } | null>;
  remover: (
    userId: string,
    listaId: string,
    mediaId: string,
  ) => Promise<{ removido: true } | null>;
};

/**
 * Adicionar é idempotente: obra que já estava continua lá (#237). Antes era
 * toggle, e dois cliques rápidos removiam sem querer (#148, item 13).
 *
 * A obra não precisa estar na estante nem no cache — lista é curadoria, quem
 * só conhece a obra também lista. Fora do cache, vem do AniList (Kitsu como
 * degrau de baixo) e é cacheada, como na estante. Em cache, serve em qualquer
 * idade: pertencer a uma lista não precisa de dados frescos, e poupa cota.
 */
export async function adicionarObraNaLista(
  pedido: { userId: string; listaId: string; anilistId: number },
  deps: DependenciasDeAdicao,
): Promise<
  | { estado: "ok"; contem: true }
  | { estado: "nao_encontrada" }
  | { estado: "obra_desconhecida" }
  | { estado: "indisponivel" }
  | { estado: "lista_cheia" }
  | { estado: "limitado"; esperarSegundos: number }
>
{
  const limite = await deps.limitar(pedido.userId);

  if (limite.bloqueado)
  {
    return { estado: "limitado", esperarSegundos: limite.esperarSegundos };
  }

  const emCache = await deps.buscarMedia(pedido.anilistId);

  let mediaId: string;

  if (emCache !== null)
  {
    mediaId = emCache.id;
  }
  else
  {
    let obra: MediaDoAniList | null;

    try
    {
      obra = await deps.buscarNoAniList(pedido.anilistId);
    }
    catch
    {
      try
      {
        obra = await deps.buscarNoKitsu(pedido.anilistId);
      }
      catch
      {
        return { estado: "indisponivel" };
      }
    }

    if (obra === null)
    {
      return { estado: "obra_desconhecida" };
    }

    const salvo = await deps.salvarMedia(obra, deps.relogio?.() ?? new Date());
    mediaId = salvo.id;
  }

  const adicionado = await deps.adicionar(pedido.userId, pedido.listaId, mediaId);

  if (adicionado === null)
  {
    return { estado: "nao_encontrada" };
  }

  if ("cheia" in adicionado)
  {
    return { estado: "lista_cheia" };
  }

  return { estado: "ok", contem: true };
}

/**
 * Remover é um verbo próprio, idempotente na intenção: numa página
 * desatualizada, "remover" nunca pode virar "adicionar" (#65, item 9).
 * `nao_encontrada` cobre lista alheia/inexistente e obra que já não estava.
 */
export async function removerObraDaLista(
  pedido: { userId: string; listaId: string; anilistId: number },
  deps: DependenciasDeRemocao,
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
export function adicionarObraNaListaDoSistema(pedido: {
  userId: string;
  listaId: string;
  anilistId: number;
})
{
  return adicionarObraNaLista(pedido, {
    buscarMedia: buscarMediaPorAnilistId,
    buscarNoAniList: buscarMediaPorId,
    buscarNoKitsu: buscarNoKitsuPorAnilistId,
    salvarMedia: salvarMediaDoAniList,
    adicionar: adicionarItem,
    limitar: function (userId) { return limitarItemDeLista({ userId }); },
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

export type DependenciasDeListasPublicas = {
  listar: (limite: number, ordem: OrdemDasListas) => Promise<ListaPublica[]>;
};

/**
 * A listagem pública, com rodízio de autoria (#144): trinta cards ordenados só
 * por data deixavam uma conta ocupar a página inteira, e repostar de tempos em
 * tempos mantinha assim. Vale nas duas ordenações — por curtidas o rodízio não
 * mexe no ranking, só pula o excedente de quem já apareceu duas vezes.
 */
export async function listasPublicas(
  ordem: OrdemDasListas,
  deps: DependenciasDeListasPublicas,
): Promise<ListaPublica[]>
{
  const linhas = await deps.listar(LIMITE_DE_LISTAS_PUBLICAS * FATOR_DE_BUSCA, ordem);

  return noMaximoPorAutor(
    linhas,
    function (lista) { return lista.username; },
    MAXIMO_POR_AUTOR,
    LIMITE_DE_LISTAS_PUBLICAS,
  );
}

/** A composição de produção. As listas de todo mundo, na ordem pedida (issue #80). */
export function listasPublicasDoSistema(ordem: OrdemDasListas = "recentes"): Promise<ListaPublica[]>
{
  return listasPublicas(ordem, { listar: listarListasPublicas });
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
  /** O dono da lista, ou null quando ela não existe. */
  buscarDono: (listaId: string) => Promise<string | null>;
  alternar: (
    listaId: string,
    userId: string,
  ) => Promise<{ curtida: boolean; total: number } | null>;
};

/**
 * Curtir a PRÓPRIA lista é recusado (#148, item 4), como curtir o próprio perfil
 * já era desde a #74. Sem isso, quem cria a lista se somava no ranking por
 * curtidas de `/listas`.
 */
export async function curtirLista(
  pedido: { userId: string; listaId: string },
  deps: DependenciasDeCurtidaDeLista,
): Promise<
  | { estado: "ok"; curtida: boolean; total: number }
  | { estado: "nao_encontrada" }
  | { estado: "a_si_mesmo" }
>
{
  const dono = await deps.buscarDono(pedido.listaId);

  if (dono === null)
  {
    return { estado: "nao_encontrada" };
  }

  if (!podeSeRelacionar(pedido.userId, dono))
  {
    return { estado: "a_si_mesmo" };
  }

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
  return curtirLista(pedido, {
    alternar: alternarCurtidaDaLista,
    buscarDono: donoDaLista,
  });
}

/** Só o nome da lista, para metadata (#135): não carrega os itens duas vezes por visita. */
export function nomeDaListaDoSistema(listaId: string): Promise<string | null>
{
  return buscarNomeDaLista(listaId);
}
