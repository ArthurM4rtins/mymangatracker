// ReadingSource: PRIVADO DO DONO — toda consulta carrega userId. Muitas fontes
// por (userId, mediaId), UMA ativa: o índice único parcial da migration
// `entidades_fase_1` garante no banco o que a troca aqui respeita.
import { getPrisma } from "./prisma";

export type FonteAtiva = {
  id: string;
  sourceHost: string;
  urlTemplate: string;
};

export function buscarFonteAtiva(
  userId: string,
  mediaId: string,
): Promise<FonteAtiva | null>
{
  return getPrisma().readingSource.findFirst({
    where: { userId, mediaId, isActive: true },
    select: { id: true, sourceHost: true, urlTemplate: true },
  });
}

/** As fontes ativas do usuário, para a listagem da estante compor numa ida só. */
export function listarFontesAtivas(
  userId: string,
): Promise<Array<FonteAtiva & { mediaId: string }>>
{
  return getPrisma().readingSource.findMany({
    where: { userId, isActive: true },
    select: { id: true, mediaId: true, sourceHost: true, urlTemplate: true },
  });
}

/**
 * Desativa a fonte ativa (se houver) e cria a nova, na mesma transação.
 * O histórico fica: trocar de fonte nunca apaga linha — progresso pertence à
 * obra, não ao site.
 */
export async function trocarFonteAtiva(dados: {
  userId: string;
  mediaId: string;
  sourceHost: string;
  urlTemplate: string;
  confirmadaEm: Date;
}): Promise<{ id: string }>
{
  const prisma = getPrisma();

  const [, criada] = await prisma.$transaction([
    prisma.readingSource.updateMany({
      where: { userId: dados.userId, mediaId: dados.mediaId, isActive: true },
      data: { isActive: false },
    }),
    prisma.readingSource.create({
      data: {
        userId: dados.userId,
        mediaId: dados.mediaId,
        sourceHost: dados.sourceHost,
        urlTemplate: dados.urlTemplate,
        isActive: true,
        confirmedAt: dados.confirmadaEm,
      },
      select: { id: true },
    }),
  ]);

  return criada;
}
