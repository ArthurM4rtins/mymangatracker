// Entry: a avaliação do usuário — nota e/ou resenha, uma por (userId, mediaId).
// Toda consulta carrega userId. Visível só ao dono até a fase social.
import { getPrisma } from "./prisma";

export type AvaliacaoDaObra = {
  mediaId: string;
  rating: string | null;
  review: string | null;
  containsSpoilers: boolean;
};

/**
 * Upsert por (userId, mediaId) — avaliar de novo edita, nunca duplica.
 *
 * `reviewedAt` é a data em que a RESENHA nasceu (#111): avança quando `review`
 * passa de vazio a texto, e só aí. Mudar a nota ou editar o texto não mexe —
 * o feed, o perfil e a página da obra ordenam e exibem por esse campo, e uma
 * edição não pode trazer resenha velha de volta ao topo. `updatedAt` conta as
 * edições.
 *
 * Curtidas e comentários são sobre o TEXTO (#112): quando `review` passa de
 * texto a vazio, saem na mesma transação. Senão ressurgiam colados num texto
 * novo e diferente. Editar o texto mantém.
 *
 * A mesma purga roda no renascimento (#138). Entre apagar o texto e escrever
 * outro a linha continua existindo, e o id dela já foi entregue ao navegador
 * de quem leu a resenha pública — quem guardou o id gravava curtida e
 * comentário numa resenha que não existe. `review-social.repository.ts` agora
 * recusa essa escrita; purgar aqui também fecha o que já estiver gravado, de
 * antes desta correção ou por corrida.
 */
export async function salvarAvaliacao(dados: {
  userId: string;
  mediaId: string;
  rating: number | null;
  review: string | null;
  containsSpoilers: boolean;
}): Promise<{ id: string }>
{
  const prisma = getPrisma();
  const chave = { userId_mediaId: { userId: dados.userId, mediaId: dados.mediaId } };

  const campos = {
    rating: dados.rating,
    review: dados.review,
    containsSpoilers: dados.containsSpoilers,
  };

  const existente = await prisma.entry.findUnique({
    where: chave,
    select: { id: true, review: true },
  });

  const resenhaNasceu = existente !== null && existente.review === null && dados.review !== null;
  const textoApagado = existente !== null && existente.review !== null && dados.review === null;

  if (textoApagado || resenhaNasceu)
  {
    const dadosDaLinha = resenhaNasceu ? { ...campos, reviewedAt: new Date() } : campos;

    const [, , atualizada] = await prisma.$transaction([
      prisma.reviewLike.deleteMany({ where: { entryId: existente.id } }),
      prisma.reviewComment.deleteMany({ where: { entryId: existente.id } }),
      prisma.entry.update({ where: chave, data: dadosDaLinha, select: { id: true } }),
    ]);

    return atualizada;
  }

  return prisma.entry.upsert({
    where: chave,
    create: { userId: dados.userId, mediaId: dados.mediaId, ...campos },
    update: campos,
    select: { id: true },
  });
}

/** As avaliações do usuário, para a listagem da estante compor numa ida só. */
export async function listarAvaliacoes(userId: string): Promise<AvaliacaoDaObra[]>
{
  const linhas = await getPrisma().entry.findMany({
    where: { userId },
    select: {
      mediaId: true,
      rating: true,
      review: true,
      containsSpoilers: true,
    },
  });

  return linhas.map(function (linha)
  {
    return {
      mediaId: linha.mediaId,
      rating: linha.rating?.toString() ?? null,
      review: linha.review,
      containsSpoilers: linha.containsSpoilers,
    };
  });
}

/** A avaliação DO USUÁRIO para uma obra. `null` = ainda não avaliou. */
export async function buscarAvaliacao(
  userId: string,
  mediaId: string,
): Promise<AvaliacaoDaObra | null>
{
  const linha = await getPrisma().entry.findUnique({
    where: { userId_mediaId: { userId, mediaId } },
    select: { mediaId: true, rating: true, review: true, containsSpoilers: true },
  });

  if (linha === null)
  {
    return null;
  }

  return {
    mediaId: linha.mediaId,
    rating: linha.rating?.toString() ?? null,
    review: linha.review,
    containsSpoilers: linha.containsSpoilers,
  };
}

/**
 * Quantas notas de cada valor a obra tem, de TODOS os usuários (issue #48).
 * Agregado público consciente: sai só o valor da nota e a contagem — nenhum
 * userId, nenhuma resenha. O domínio transforma isso em média e histograma.
 */
export async function contarNotasPorValor(
  mediaId: string,
): Promise<Array<{ rating: number; total: number }>>
{
  const grupos = await getPrisma().entry.groupBy({
    by: ["rating"],
    where: { mediaId, rating: { not: null } },
    _count: { _all: true },
  });

  return grupos.flatMap(function (grupo)
  {
    return grupo.rating === null
      ? []
      : [{ rating: Number(grupo.rating), total: grupo._count._all }];
  });
}

/**
 * Remove a avaliação DO USUÁRIO. `null` quando não existe ou é de outro —
 * iguais de propósito.
 */
export async function removerAvaliacao(
  userId: string,
  mediaId: string,
): Promise<{ removida: true } | null>
{
  const resultado = await getPrisma().entry.deleteMany({
    where: { userId, mediaId },
  });

  return resultado.count === 0 ? null : { removida: true };
}
