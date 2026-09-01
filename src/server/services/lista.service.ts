/**
 * Casos de uso das listas (issue #41): criar, apagar e alternar obra (toggle
 * a partir da página da obra). Quem resolve a sessão é o controller.
 */
import { buscarMediaPorAnilistId } from "@/server/repositories/media.repository";
import {
  adicionarItem,
  apagarLista,
  buscarListaComItens,
  criarLista,
  listarListasPublicas,
  listarMinhasListas,
  removerItem,
  type ListaComItens,
  type ListaPublica,
} from "@/server/repositories/lista.repository";

const NOME_MAXIMO = 100;

export type DependenciasDeCriacao = {
  criar: (dados: {
    userId: string;
    nome: string;
    descricao: string | null;
  }) => Promise<{ id: string }>;
};

export async function criarListaDoUsuario(
  pedido: { userId: string; nome: string; descricao: string | null },
  deps: DependenciasDeCriacao,
): Promise<{ estado: "ok"; listaId: string } | { estado: "lista_invalida" }>
{
  const nome = pedido.nome.trim();
  const descricao = pedido.descricao?.trim() || null;

  if (nome === "" || nome.length > NOME_MAXIMO)
  {
    return { estado: "lista_invalida" };
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
  ) => Promise<{ jaExistia: boolean } | null>;
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

  if (!adicionado.jaExistia)
  {
    return { estado: "ok", contem: true };
  }

  await deps.remover(pedido.userId, pedido.listaId, media.id);

  return { estado: "ok", contem: false };
}

/** A composição de produção. */
export function criarListaDoSistema(pedido: {
  userId: string;
  nome: string;
  descricao: string | null;
})
{
  return criarListaDoUsuario(pedido, { criar: criarLista });
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

const LIMITE_DE_LISTAS_PUBLICAS = 30;

/** A composição de produção. As listas recentes de todo mundo. */
export function listasPublicasDoSistema(): Promise<ListaPublica[]>
{
  return listarListasPublicas(LIMITE_DE_LISTAS_PUBLICAS);
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
