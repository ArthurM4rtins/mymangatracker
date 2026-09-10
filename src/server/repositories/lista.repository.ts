// Listas de obras (issue #41). LEITURA É PÚBLICA — recorte do social:
// username do dono, e-mail e ids de usuário nunca saem. ESCRITA é sempre do
// dono: toda mutação carrega userId no where ou verifica a posse antes.
import type { OrdemDasListas } from "@/server/domain/lista-listagem";
import { Prisma } from "@/generated/prisma/client";
import { chaveDaObra, referenciaDeMedia, type ReferenciaDaObra } from "@/server/domain/referencia-da-obra";
import { getPrisma } from "./prisma";

export type CapaDePreview = string | null;

export type ListaPublica = {
  listaId: string;
  nome: string;
  descricao: string | null;
  username: string;
  totalDeObras: number;
  capas: CapaDePreview[];
  criadaEm: Date;
  curtidas: number;
};

export type ItemDaLista = {
  chave: string;
  titleRomaji: string;
  titleEnglish: string | null;
  coverImageUrl: string | null;
};

export type ListaComItens = {
  listaId: string;
  nome: string;
  descricao: string | null;
  username: string;
  minha: boolean;
  itens: ItemDaLista[];
  curtidas: number;
  curtiPorMim: boolean;
};

const CAPAS_DE_PREVIEW = 4;

export async function criarLista(dados: {
  userId: string;
  nome: string;
  descricao: string | null;
}): Promise<{ id: string }>
{
  return getPrisma().list.create({
    data: dados,
    select: { id: true },
  });
}

/** Apaga a lista DO DONO. Alheia ou inexistente = `null`, iguais. */
export async function apagarLista(
  userId: string,
  listaId: string,
): Promise<{ removida: true } | null>
{
  const resultado = await getPrisma().list.deleteMany({
    where: { id: listaId, userId },
  });

  return resultado.count === 0 ? null : { removida: true };
}

/** O select do card de lista pública: o mesmo em /listas e no perfil. */
const SELECT_DO_CARD = {
  id: true,
  nome: true,
  descricao: true,
  createdAt: true,
  user: { select: { username: true } },
  _count: { select: { itens: true, likes: true } },
  itens: {
    orderBy: { position: "asc" as const },
    take: CAPAS_DE_PREVIEW,
    select: { media: { select: { coverImageUrl: true } } },
  },
} as const;

type LinhaDoCard = {
  id: string;
  nome: string;
  descricao: string | null;
  createdAt: Date;
  user: { username: string };
  _count: { itens: number; likes: number };
  itens: Array<{ media: { coverImageUrl: string | null } }>;
};

function paraCard(linha: LinhaDoCard): ListaPublica
{
  return {
    listaId: linha.id,
    nome: linha.nome,
    descricao: linha.descricao,
    username: linha.user.username,
    totalDeObras: linha._count.itens,
    capas: linha.itens.map(function (item) { return item.media.coverImageUrl; }),
    criadaEm: linha.createdAt,
    curtidas: linha._count.likes,
  };
}

/**
 * As listas de todo mundo, com preview de capas. "recentes" pela criação;
 * "curtidas" pelo total de curtidas, empate pela criação (issue #80).
 */
export async function listarListasPublicas(
  limite: number,
  ordem: OrdemDasListas = "recentes",
): Promise<ListaPublica[]>
{
  const linhas = await getPrisma().list.findMany({
    orderBy:
      ordem === "curtidas"
        ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
        : { createdAt: "desc" },
    take: limite,
    select: SELECT_DO_CARD,
  });

  return linhas.map(paraCard);
}

/** As listas DE UM usuário, para o perfil público (issue #49) — as `limite` mais recentes (#135). */
export async function listarListasDoUsuario(userId: string, limite: number): Promise<ListaPublica[]>
{
  const linhas = await getPrisma().list.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limite,
    select: SELECT_DO_CARD,
  });

  return linhas.map(paraCard);
}

/** Quantas listas o usuário tem — o número do perfil, sem materializar (#135). */
export function contarListasDoUsuario(userId: string): Promise<number>
{
  return getPrisma().list.count({ where: { userId } });
}

/**
 * De quem é a lista. `null` quando não existe. O serviço usa para recusar
 * curtida na própria lista (#148, item 4).
 */
export async function donoDaLista(listaId: string): Promise<string | null>
{
  const linha = await getPrisma().list.findUnique({
    where: { id: listaId },
    select: { userId: true },
  });

  return linha?.userId ?? null;
}

/** Só o nome, para o `generateMetadata` não carregar a lista inteira duas vezes (#135). */
export async function buscarNomeDaLista(listaId: string): Promise<string | null>
{
  const linha = await getPrisma().list.findUnique({ where: { id: listaId }, select: { nome: true } });

  return linha?.nome ?? null;
}

/** A lista com as obras, na ordem de inserção. `null` quando não existe. */
export async function buscarListaComItens(
  listaId: string,
  userId: string | null,
): Promise<ListaComItens | null>
{
  const linha = await getPrisma().list.findUnique({
    where: { id: listaId },
    select: {
      id: true,
      nome: true,
      descricao: true,
      userId: true,
      user: { select: { username: true } },
      _count: { select: { likes: true } },
      likes: userId === null ? false : { where: { userId }, select: { id: true } },
      itens: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        // O mesmo teto que `adicionarItem` impõe: a página nunca carrega mais (#135).
        take: ITENS_POR_LISTA,
        select: {
          media: {
            select: {
              anilistId: true,
              kitsuId: true,
              titleRomaji: true,
              titleEnglish: true,
              coverImageUrl: true,
            },
          },
        },
      },
    },
  });

  if (linha === null)
  {
    return null;
  }

  return {
    listaId: linha.id,
    nome: linha.nome,
    descricao: linha.descricao,
    username: linha.user.username,
    minha: linha.userId === userId,
    itens: linha.itens
      .map(function (item) { return { media: item.media, referencia: referenciaDeMedia(item.media) }; })
      .filter(function (item) { return item.referencia !== null; })
      .map(function (item)
      {
        return { ...item.media, chave: chaveDaObra(item.referencia as ReferenciaDaObra) };
      }),
    curtidas: linha._count.likes,
    curtiPorMim: Array.isArray(linha.likes) && linha.likes.length > 0,
  };
}

/** Edita nome/descrição da lista DO DONO. Alheia ou inexistente = `null`. */
export async function editarLista(
  userId: string,
  listaId: string,
  campos: { nome: string; descricao: string | null },
): Promise<{ editada: true } | null>
{
  const resultado = await getPrisma().list.updateMany({
    where: { id: listaId, userId },
    data: campos,
  });

  return resultado.count === 0 ? null : { editada: true };
}

/**
 * Os itens da lista DO DONO na ordem atual, com o par anilistId/mediaId que
 * o serviço usa pra validar e traduzir a proposta. `null` = alheia/inexistente.
 */
export async function listarItensParaOrdem(
  userId: string,
  listaId: string,
): Promise<Array<{ chave: string; mediaId: string }> | null>
{
  const lista = await getPrisma().list.findFirst({
    where: { id: listaId, userId },
    select: {
      itens: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { mediaId: true, media: { select: { anilistId: true, kitsuId: true } } },
      },
    },
  });

  if (lista === null)
  {
    return null;
  }

  return lista.itens
    .map(function (item)
    {
      return { referencia: referenciaDeMedia(item.media), mediaId: item.mediaId };
    })
    .filter(function (item): item is { referencia: ReferenciaDaObra; mediaId: string }
    {
      return item.referencia !== null;
    })
    .map(function (item)
    {
      return { chave: chaveDaObra(item.referencia), mediaId: item.mediaId };
    });
}

/**
 * Grava a ordem inteira: `position = índice + 1`. Quem garante que `mediaIds`
 * é permutação exata dos itens é o serviço.
 *
 * Um `UPDATE` só (#146). Antes era um `updateMany` por item dentro de uma
 * transação: uma lista no teto do schema virava 500 statements segurando lock
 * nas 500 linhas durante toda a ida e volta, e repetir o pedido prendia
 * conexões do pool. `unnest` casa os dois arrays em uma tabela derivada, então
 * o custo deixa de crescer em statements — e os ids continuam indo como
 * parâmetro, nunca interpolados na string.
 */
export async function reordenarItens(
  userId: string,
  listaId: string,
  mediaIds: string[],
): Promise<{ reordenada: true } | null>
{
  const prisma = getPrisma();

  const lista = await prisma.list.findFirst({
    where: { id: listaId, userId },
    select: { id: true },
  });

  if (lista === null)
  {
    return null;
  }

  if (mediaIds.length > 0)
  {
    const posicoes = mediaIds.map(function (_, indice) { return indice + 1; });

    await prisma.$executeRaw`
      UPDATE "ListItem" AS item
      SET position = nova.posicao
      FROM unnest(${mediaIds}::text[], ${posicoes}::int[]) AS nova(media_id, posicao)
      WHERE item."listId" = ${listaId} AND item."mediaId" = nova.media_id
    `;
  }

  return { reordenada: true };
}

/**
 * Toggle da curtida na lista (issue #51). `null` quando a lista não existe
 * (FK estoura no create). Devolve o estado final e o total.
 *
 * Atômico (#65, item 16): apaga se havia, senão cria. Dois cliques
 * concorrentes não viram 404 — o segundo `create` bate no unique (P2002) e é
 * lido como "já curtida". Qualquer outro erro sobe para a rota responder 500.
 */
export async function alternarCurtidaDaLista(
  listaId: string,
  userId: string,
): Promise<{ curtida: boolean; total: number } | null>
{
  const prisma = getPrisma();

  const apagadas = await prisma.listLike.deleteMany({ where: { listId: listaId, userId } });
  let curtida = false;

  if (apagadas.count === 0)
  {
    try
    {
      await prisma.listLike.create({ data: { listId: listaId, userId } });
    }
    catch (erro)
    {
      if (eErroDoPrisma(erro, "P2003"))
      {
        // FK: lista (ou usuário) não existe. Mesma resposta de inexistente.
        return null;
      }

      if (!eErroDoPrisma(erro, "P2002"))
      {
        throw erro;
      }
    }

    curtida = true;
  }

  const total = await prisma.listLike.count({ where: { listId: listaId } });

  return { curtida, total };
}

/** As listas DO USUÁRIO, com "já contém" para o dropdown da página da obra. */
export async function listarMinhasListas(
  userId: string,
  mediaId: string | null,
): Promise<Array<{ listaId: string; nome: string; jaContem: boolean }>>
{
  const linhas = await getPrisma().list.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nome: true,
      itens:
        mediaId === null ? false : { where: { mediaId }, select: { id: true } },
    },
  });

  return linhas.map(function (linha)
  {
    return {
      listaId: linha.id,
      nome: linha.nome,
      jaContem: Array.isArray(linha.itens) && linha.itens.length > 0,
    };
  });
}

/**
 * Adiciona a obra à lista DO DONO, no fim. `null` quando a lista não é do
 * usuário ou não existe; `{ jaExistia: true }` quando a obra já estava lá.
 */
/** Teto de obras por lista (#135). A rota de ordem (`listas/[id]/ordem`) assume o mesmo número. */
export const ITENS_POR_LISTA = 500;

export async function adicionarItem(
  userId: string,
  listaId: string,
  mediaId: string,
): Promise<{ jaExistia: boolean } | { cheia: true } | null>
{
  const prisma = getPrisma();

  const lista = await prisma.list.findFirst({
    where: { id: listaId, userId },
    select: { id: true },
  });

  if (lista === null)
  {
    return null;
  }

  // Fim da lista = maior posição + 1, não contagem + 1: depois de remoções a
  // contagem repete posições e o item novo cairia no meio (#65, itens 8/25).
  // A contagem entra só para o teto (#135): lista sem fim era o que inflava a
  // página pública, e a rota de ordem já assumia 500.
  const { _max, _count } = await prisma.listItem.aggregate({
    where: { listId: listaId },
    _max: { position: true },
    _count: { _all: true },
  });

  if (_count._all >= ITENS_POR_LISTA)
  {
    return { cheia: true };
  }

  try
  {
    await prisma.listItem.create({
      data: { listId: listaId, mediaId, position: (_max.position ?? 0) + 1 },
    });

    return { jaExistia: false };
  }
  catch (erro)
  {
    // Só o unique (listId, mediaId) significa "já estava na lista" (#65,
    // itens 7/20). O resto sobe: tratar banco fora como duplicata fazia o
    // toggle REMOVER o item que outra requisição acabou de gravar.
    if (eErroDoPrisma(erro, "P2002"))
    {
      return { jaExistia: true };
    }

    throw erro;
  }
}

function eErroDoPrisma(erro: unknown, codigo: "P2002" | "P2003"): boolean
{
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === codigo;
}

/** Remove a obra da lista DO DONO. `null` = lista alheia/inexistente ou obra fora. */
export async function removerItem(
  userId: string,
  listaId: string,
  mediaId: string,
): Promise<{ removido: true } | null>
{
  const resultado = await getPrisma().listItem.deleteMany({
    where: { listId: listaId, mediaId, list: { userId } },
  });

  return resultado.count === 0 ? null : { removido: true };
}
