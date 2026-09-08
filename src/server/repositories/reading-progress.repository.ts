// ReadingProgress é PRIVADO DO DONO: toda função aqui recebe `userId` e o leva
// para dentro do `where`. Não existe consulta que devolva progresso sem dono —
// é invariante do sistema, não preferência do usuário, e os testes em
// `tests/repositories/reading-progress.privacy.test.ts` travam isso.
import type { ReadingProgress, ShelfStatus } from "@/generated/prisma/client";
import { getPrisma } from "./prisma";

export type NovaAbertura = {
  userId: string;
  mediaId: string;
  chapter: number;
  resolvedUrl: string;
  readingSourceId?: string;
  /**
   * Status que a entrada passa a ter — quem decide é o domínio
   * (`statusAposLeitura`). Ausente quando não há o que mudar.
   */
  novoStatus?: ShelfStatus;
};

/**
 * Grava a abertura de um capítulo. Uma linha por clique — o histórico.
 *
 * Releitura não mexe no progresso, mas ainda pode mexer no status: quem volta à
 * obra que tinha pausado voltou a ler. Quando isso acontece, histórico e status
 * vão na MESMA transação.
 */
export async function registrarAbertura(dados: NovaAbertura): Promise<{ id: string }>
{
  const prisma = getPrisma();

  const criacao = {
    data: {
      userId: dados.userId,
      mediaId: dados.mediaId,
      readingSourceId: dados.readingSourceId ?? null,
      chapter: dados.chapter,
      resolvedUrl: dados.resolvedUrl,
    },
    select: { id: true },
  };

  if (dados.novoStatus === undefined)
  {
    return prisma.readingProgress.create(criacao);
  }

  const [registro] = await prisma.$transaction([
    prisma.readingProgress.create(criacao),
    prisma.shelfEntry.updateMany({
      where: { userId: dados.userId, mediaId: dados.mediaId },
      data: { status: dados.novoStatus },
    }),
  ]);

  return registro;
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
      data: {
        progressChapter: dados.novoProgresso,
        ...(dados.novoStatus !== undefined && { status: dados.novoStatus }),
      },
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

export type AberturaMaisAvancada = {
  mediaId: string;
  resolvedUrl: string;
  chapter: string;
};

/**
 * A abertura MAIS AVANÇADA de cada obra do usuário — uma linha por obra. É o
 * destino do "Continuar leitura" na estante e na home (#170).
 *
 * Maior capítulo, não o mais recente: quem releu o 2 depois de chegar no 94
 * continua do 94, a mesma regra que o progresso da estante já segue. Empate no
 * capítulo desempata pela abertura mais nova — o site onde a pessoa leu por
 * último é o que ela quer reabrir.
 *
 * Privado do dono como toda leitura de progresso: a consulta carrega `userId`.
 */
export async function listarAberturasMaisAvancadas(
  userId: string,
): Promise<AberturaMaisAvancada[]>
{
  const linhas = await getPrisma().readingProgress.findMany({
    where: { userId },
    orderBy: [{ mediaId: "asc" }, { chapter: "desc" }, { openedAt: "desc" }],
    distinct: ["mediaId"],
    select: { mediaId: true, resolvedUrl: true, chapter: true },
  });

  return linhas.map(function (linha)
  {
    return {
      mediaId: linha.mediaId,
      resolvedUrl: linha.resolvedUrl,
      chapter: linha.chapter.toString(),
    };
  });
}

/**
 * A abertura mais avançada NESTA obra — destino do "Continuar leitura" na
 * página da obra (#170). Mesma regra de `listarAberturasMaisAvancadas`.
 */
export async function aberturaMaisAvancadaDaObra(
  userId: string,
  mediaId: string,
): Promise<{ resolvedUrl: string; chapter: string } | null>
{
  const linha = await getPrisma().readingProgress.findFirst({
    where: { userId, mediaId },
    orderBy: [{ chapter: "desc" }, { openedAt: "desc" }],
    select: { resolvedUrl: true, chapter: true },
  });

  return linha === null
    ? null
    : { resolvedUrl: linha.resolvedUrl, chapter: linha.chapter.toString() };
}

/**
 * Quantas aberturas a pessoa tem nesta obra. E o numero que a confirmacao do
 * reset mostra (#172): o historico da pagina e limitado a 20 e nao serve como
 * total. Privado do dono: carrega userId.
 */
export function contarAberturas(userId: string, mediaId: string): Promise<number>
{
  return getPrisma().readingProgress.count({ where: { userId, mediaId } });
}

/**
 * O reset de leitura (#172, parte 2): apaga o historico da obra E zera o
 * capitulo marcado a mao, na MESMA transacao. O progresso e o maior entre os
 * dois, entao apagar so um lado nao corrige nada. O status fica.
 *
 * Privado do dono: as duas escritas carregam userId.
 */
export async function apagarHistoricoEZerarProgresso(
  userId: string,
  mediaId: string,
): Promise<{ removidas: number }>
{
  const prisma = getPrisma();

  const [apagadas] = await prisma.$transaction([
    prisma.readingProgress.deleteMany({ where: { userId, mediaId } }),
    prisma.shelfEntry.updateMany({
      where: { userId, mediaId },
      data: { progressChapter: null },
    }),
  ]);

  return { removidas: apagadas.count };
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
