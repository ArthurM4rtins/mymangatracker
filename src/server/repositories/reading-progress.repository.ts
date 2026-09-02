// ReadingProgress é PRIVADO DO DONO: toda função aqui recebe `userId` e o leva
// para dentro do `where`. Não existe consulta que devolva progresso sem dono —
// é invariante do sistema, não preferência do usuário, e os testes em
// `tests/repositories/reading-progress.privacy.test.ts` travam isso.
import type { ReadingProgress } from "@/generated/prisma/client";
import { getPrisma } from "./prisma";

export type NovaAbertura = {
  userId: string;
  mediaId: string;
  chapter: number;
  resolvedUrl: string;
  readingSourceId?: string;
};

/** Grava a abertura de um capítulo. Uma linha por clique — o histórico. */
export function registrarAbertura(dados: NovaAbertura): Promise<ReadingProgress>
{
  return getPrisma().readingProgress.create({
    data: {
      userId: dados.userId,
      mediaId: dados.mediaId,
      readingSourceId: dados.readingSourceId ?? null,
      chapter: dados.chapter,
      resolvedUrl: dados.resolvedUrl,
    },
  });
}

/**
 * Abertura que avança o progresso: grava o histórico e atualiza o
 * `ShelfEntry.progressChapter` na MESMA transação — a denormalização que a
 * estante mostra nunca diverge do histórico.
 *
 * Quem decide se avança é o serviço (regra do maior capítulo, no domínio);
 * releitura usa `registrarAbertura` puro.
 */
export async function registrarAberturaComProgresso(
  dados: NovaAbertura & { novoProgresso: number },
): Promise<{ id: string }>
{
  const prisma = getPrisma();

  const [registro] = await prisma.$transaction([
    prisma.readingProgress.create({
      data: {
        userId: dados.userId,
        mediaId: dados.mediaId,
        readingSourceId: dados.readingSourceId ?? null,
        chapter: dados.chapter,
        resolvedUrl: dados.resolvedUrl,
      },
      select: { id: true },
    }),
    prisma.shelfEntry.updateMany({
      where: { userId: dados.userId, mediaId: dados.mediaId },
      data: { progressChapter: dados.novoProgresso },
    }),
  ]);

  return registro;
}

/**
 * A abertura mais recente. É a consulta que o índice
 * `[userId, mediaId, openedAt desc]` serve.
 */
export function ultimaAbertura(
  userId: string,
  mediaId: string,
): Promise<ReadingProgress | null>
{
  return getPrisma().readingProgress.findFirst({
    where: { userId, mediaId },
    orderBy: { openedAt: "desc" },
  });
}

export type AberturaDoHistorico = {
  id: string;
  chapter: string;
  abertaEm: Date;
  /** Host da fonte usada; `null` quando a fonte foi removida (SetNull). */
  sourceHost: string | null;
  url: string;
};

/**
 * O histórico de leitura DO DONO na obra (issue #54): capítulo, quando e por
 * qual fonte, do mais recente ao mais antigo. Mesma consulta que o índice
 * `[userId, mediaId, openedAt desc]` serve. Nunca sai para outro usuário.
 */
export async function listarAberturas(
  userId: string,
  mediaId: string,
  limite: number,
): Promise<AberturaDoHistorico[]>
{
  const linhas = await getPrisma().readingProgress.findMany({
    where: { userId, mediaId },
    orderBy: { openedAt: "desc" },
    take: limite,
    select: {
      id: true,
      chapter: true,
      openedAt: true,
      resolvedUrl: true,
      readingSource: { select: { sourceHost: true } },
    },
  });

  return linhas.map(function (linha)
  {
    return {
      id: linha.id,
      chapter: linha.chapter.toString(),
      abertaEm: linha.openedAt,
      sourceHost: linha.readingSource?.sourceHost ?? null,
      url: linha.resolvedUrl,
    };
  });
}

/**
 * O progresso na obra: o MAIOR capítulo aberto, não o último nem a contagem de
 * aberturas. Quem pulou capítulos e voltou atrás não perde o progresso.
 */
export async function maiorCapitulo(
  userId: string,
  mediaId: string,
): Promise<number | null>
{
  const { _max } = await getPrisma().readingProgress.aggregate({
    where: { userId, mediaId },
    _max: { chapter: true },
  });

  return _max.chapter === null ? null : Number(_max.chapter);
}
