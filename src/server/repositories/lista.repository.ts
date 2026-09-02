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
  user: { select: { username: true } },
  _count: { select: { itens: true } },
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
  user: { username: string };
  _count: { itens: number };
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
  };
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
