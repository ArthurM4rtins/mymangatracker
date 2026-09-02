// Listas de obras (issue #41). LEITURA É PÚBLICA — recorte do social:
// username do dono, e-mail e ids de usuário nunca saem. ESCRITA é sempre do
// dono: toda mutação carrega userId no where ou verifica a posse antes.
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
  anilistId: number;
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

/** As listas mais recentes de todo mundo, com preview de capas. */
export async function listarListasPublicas(limite: number): Promise<ListaPublica[]>
{
  const linhas = await getPrisma().list.findMany({
    orderBy: { createdAt: "desc" },
    take: limite,
    select: SELECT_DO_CARD,
  });

  return linhas.map(paraCard);
}

/** As listas DE UM usuário, para o perfil público (issue #49). */
export async function listarListasDoUsuario(userId: string): Promise<ListaPublica[]>
{
  const linhas = await getPrisma().list.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: SELECT_DO_CARD,
  });

  return linhas.map(paraCard);
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
        select: {
          media: {
            select: {
              anilistId: true,
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
    itens: linha.itens.map(function (item) { return item.media; }),
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
): Promise<Array<{ anilistId: number; mediaId: string }> | null>
{
  const lista = await getPrisma().list.findFirst({
    where: { id: listaId, userId },
    select: {
      itens: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { mediaId: true, media: { select: { anilistId: true } } },
      },
    },
  });

  if (lista === null)
  {
    return null;
  }

  return lista.itens.map(function (item)
  {
    return { anilistId: item.media.anilistId, mediaId: item.mediaId };
  });
}

/**
 * Grava a ordem inteira: `position = índice + 1`, numa transação. Quem
 * garante que `mediaIds` é permutação exata dos itens é o serviço.
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

  await prisma.$transaction(
    mediaIds.map(function (mediaId, indice)
    {
      return prisma.listItem.updateMany({
        where: { listId: listaId, mediaId },
        data: { position: indice + 1 },
      });
    }),
  );

  return { reordenada: true };
}

/**
 * Toggle da curtida na lista (issue #51). `null` quando a lista não existe
 * (FK estoura no create). Devolve o estado final e o total.
 */
export async function alternarCurtidaDaLista(
  listaId: string,
  userId: string,
): Promise<{ curtida: boolean; total: number } | null>
{
  const prisma = getPrisma();

  const existente = await prisma.listLike.findUnique({
    where: { listId_userId: { listId: listaId, userId } },
    select: { id: true },
  });

  try
  {
    if (existente === null)
    {
      await prisma.listLike.create({ data: { listId: listaId, userId } });
    }
    else
    {
      await prisma.listLike.delete({ where: { id: existente.id } });
    }
  }
  catch
  {
    // FK: lista (ou usuário) não existe. Mesma resposta de inexistente.
    return null;
  }

  const total = await prisma.listLike.count({ where: { listId: listaId } });

  return { curtida: existente === null, total };
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
export async function adicionarItem(
  userId: string,
  listaId: string,
  mediaId: string,
): Promise<{ jaExistia: boolean } | null>
{
  const prisma = getPrisma();

  const lista = await prisma.list.findFirst({
    where: { id: listaId, userId },
    select: { id: true, _count: { select: { itens: true } } },
  });

  if (lista === null)
  {
    return null;
  }

  try
  {
    await prisma.listItem.create({
      data: { listId: listaId, mediaId, position: lista._count.itens + 1 },
    });

    return { jaExistia: false };
  }
  catch
  {
    // Unique (listId, mediaId): a obra já estava na lista.
    return { jaExistia: true };
  }
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
