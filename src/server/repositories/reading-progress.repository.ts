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
