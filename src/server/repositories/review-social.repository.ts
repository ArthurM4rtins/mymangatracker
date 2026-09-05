// O social das resenhas (issue #39). AS RESENHAS COM TEXTO SÃO PÚBLICAS:
// esta é a única leitura do sistema sem userId no where, consciente e
// restrita a Entry com review não nulo. De quem escreveu sai o username e
// NADA além — e-mail nunca. Progresso e fonte seguem privados.
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "./prisma";

export type ComentarioDaReview = {
  id: string;
  username: string;
  /** Versão da foto de quem escreveu (issue #87); `null` sem foto. */
  avatarVersao: number | null;
  texto: string;
  criadoEm: Date;
  meu: boolean;
};

export type ReviewPublica = {
  entryId: string;
  username: string;
  avatarVersao: number | null;
  minha: boolean;
  rating: string | null;
  review: string;
  containsSpoilers: boolean;
  publicadaEm: Date;
  curtidas: number;
  curtiPorMim: boolean;
  /** Os mais recentes, em ordem cronológica — no máximo `PAGINA_DE_COMENTARIOS`. */
  comentarios: ComentarioDaReview[];
  totalDeComentarios: number;
};

/**
 * Quantos comentários a página da obra carrega por resenha (#109). O resto sai
 * por `listarComentariosAnteriores`. Sem isto, comentário em massa numa obra
 * popular virava megabytes por render para todo visitante.
 */
export const PAGINA_DE_COMENTARIOS = 20;

const ORDEM_DOS_COMENTARIOS = [{ createdAt: "desc" }, { id: "desc" }] as const;

const SELECT_DO_COMENTARIO = {
  id: true,
  userId: true,
  texto: true,
  createdAt: true,
  user: { select: { username: true, avatarUpdatedAt: true } },
} as const;

type LinhaDeComentario = {
  id: string;
  userId: string;
  texto: string;
  createdAt: Date;
  user: { username: string; avatarUpdatedAt: Date | null };
};

function comentarioParaDto(linha: LinhaDeComentario, userId: string | null): ComentarioDaReview
{
  return {
    id: linha.id,
    username: linha.user.username,
    avatarVersao: linha.user.avatarUpdatedAt?.getTime() ?? null,
    texto: linha.texto,
    criadoEm: linha.createdAt,
    meu: linha.userId === userId,
  };
}

/**
 * As resenhas públicas da obra: mais curtidas primeiro, desempate recente.
 * `userId` (opcional) só marca "curti/meu" — não filtra nada.
 */
export async function listarReviewsDaObra(
  mediaId: string,
  userId: string | null,
): Promise<ReviewPublica[]>
{
  const linhas = await getPrisma().entry.findMany({
    where: { mediaId, review: { not: null } },
    orderBy: [{ likes: { _count: "desc" } }, { reviewedAt: "desc" }],
    select: {
      id: true,
      userId: true,
      rating: true,
      review: true,
      containsSpoilers: true,
      reviewedAt: true,
      user: { select: { username: true, avatarUpdatedAt: true } },
      _count: { select: { likes: true, comentarios: true } },
      likes:
        userId === null
          ? false
          : { where: { userId }, select: { id: true } },
      // Os mais recentes primeiro para o `take`; a ordem cronológica volta no map.
      // Desempate por id: createdAt tem milissegundo, e dois comentários no
      // mesmo ms deixavam a ordem ao acaso (teste flaky no CI). O cuid é
      // monotônico dentro do processo, então id desempata na ordem de inserção.
      comentarios: {
        orderBy: ORDEM_DOS_COMENTARIOS,
        take: PAGINA_DE_COMENTARIOS,
        select: SELECT_DO_COMENTARIO,
      },
    },
  });

  return linhas.map(function (linha)
  {
    return {
      entryId: linha.id,
      username: linha.user.username,
      avatarVersao: linha.user.avatarUpdatedAt?.getTime() ?? null,
      minha: linha.userId === userId,
      rating: linha.rating?.toString() ?? null,
      review: linha.review ?? "",
      containsSpoilers: linha.containsSpoilers,
      publicadaEm: linha.reviewedAt,
      curtidas: linha._count.likes,
      curtiPorMim: Array.isArray(linha.likes) && linha.likes.length > 0,
      comentarios: linha.comentarios
        .map(function (comentario) { return comentarioParaDto(comentario, userId); })
        .reverse(),
      totalDeComentarios: linha._count.comentarios,
    };
  });
}

/**
 * A página anterior da conversa: os `PAGINA_DE_COMENTARIOS` comentários
 * imediatamente antes do comentário `antesDoId`, em ordem cronológica. Cursor
 * por id, não por data: data tem milissegundo e empata. `userId` só marca
 * "meu" — não filtra nada; comentário é público como a resenha.
 */
export async function listarComentariosAnteriores(
  entryId: string,
  antesDoId: string,
  userId: string | null,
): Promise<ComentarioDaReview[]>
{
  const linhas = await getPrisma().reviewComment.findMany({
    where: { entryId },
    orderBy: ORDEM_DOS_COMENTARIOS,
    cursor: { id: antesDoId },
    skip: 1,
    take: PAGINA_DE_COMENTARIOS,
    select: SELECT_DO_COMENTARIO,
  });

  return linhas
    .map(function (linha) { return comentarioParaDto(linha, userId); })
    .reverse();
}

/**
 * Toggle da curtida. `null` quando a resenha não existe (FK estoura no
 * create). Devolve o estado final e o total.
 *
 * Atômico (#65, item 5): tenta apagar; se não havia, cria. Dois cliques
 * concorrentes não viram 404 — o segundo `create` bate no unique (P2002) e é
 * lido como "já curtida". Qualquer outro erro sobe para a rota responder 500.
 */
export async function alternarCurtida(
  entryId: string,
  userId: string,
): Promise<{ curtida: boolean; total: number } | null>
{
  const prisma = getPrisma();

  const apagadas = await prisma.reviewLike.deleteMany({ where: { entryId, userId } });
  let curtida = false;

  if (apagadas.count === 0)
  {
    try
    {
      await prisma.reviewLike.create({ data: { entryId, userId } });
    }
    catch (erro)
    {
      if (eErroDoPrisma(erro, "P2003"))
      {
        // FK: resenha (ou usuário) não existe. Mesma resposta de inexistente.
        return null;
      }

      if (!eErroDoPrisma(erro, "P2002"))
      {
        throw erro;
      }
    }

    curtida = true;
  }

  const total = await prisma.reviewLike.count({ where: { entryId } });

  return { curtida, total };
}

/**
 * Comenta na resenha. `null` só quando ela não existe (FK, P2003); banco fora
 * e afins sobem para a rota logar e responder 500 (#65, item 6).
 */
export async function comentarNaReview(
  entryId: string,
  userId: string,
  texto: string,
): Promise<{ id: string } | null>
{
  try
  {
    return await getPrisma().reviewComment.create({
      data: { entryId, userId, texto },
      select: { id: true },
    });
  }
  catch (erro)
  {
    if (eErroDoPrisma(erro, "P2003"))
    {
      return null;
    }

    throw erro;
  }
}

function eErroDoPrisma(erro: unknown, codigo: "P2002" | "P2003"): boolean
{
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === codigo;
}

/**
 * Apaga um comentário DO PRÓPRIO usuário. Alheio ou inexistente = `null`,
 * iguais de propósito.
 */
export async function apagarComentario(
  userId: string,
  comentarioId: string,
): Promise<{ removido: true } | null>
{
  const resultado = await getPrisma().reviewComment.deleteMany({
    where: { id: comentarioId, userId },
  });

  return resultado.count === 0 ? null : { removido: true };
}
