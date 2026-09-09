/**
 * Seguir e curtir perfil (issue #74). Toggle no mesmo desenho da curtida de
 * lista: `null` quando o alvo não existe (FK estoura no create), senão o
 * estado final e o total. O resumo sai por id de usuário e nunca carrega
 * e-mail nem id de terceiros — só números e o estado de quem olha.
 */
import { getPrisma } from "./prisma";
import { Prisma } from "@/generated/prisma/client";

export type ResultadoDoToggle = { ativo: boolean; total: number };

export type ResumoSocial = {
  seguidores: number;
  seguindo: number;
  curtidas: number;
  /** Estado de quem olha; `false` para anônimo e para o próprio dono. */
  sigo: boolean;
  curti: boolean;
};

/**
 * O que significa a falha da escrita (#148, item 14).
 *
 * Antes o `catch` era nu e devolvia `null` para tudo: com o banco fora, TODO
 * follow respondia 404 "usuário não encontrado" e nada era logado, porque o
 * `console.error` da rota nunca disparava. Ninguém ganhava acesso — era
 * observabilidade —, mas o sintoma apontava para o lugar errado.
 *
 * Agora só o que é de fato "alvo inválido" vira `null`; o resto sobe para a rota
 * logar e responder 500. Mesma discriminação por código que
 * `review-social.repository.ts` já faz.
 *
 * - P2003, violação de FK: o alvo não existe.
 * - P2039, erro cru do driver: é como o CHECK de auto-relação chega. Conferido
 *   contra o banco de verdade, não deduzido da documentação — o palpite era
 *   P2010, e o teste de banco mostrou P2039. O serviço já barra a si mesmo
 *   antes; isto é a rede embaixo.
 * - P2002: já existe. P2025: já não existe. Ambos são corrida entre dois
 *   cliques, e o estado final é o que a contagem disser.
 */
function alvoInvalido(erro: unknown): boolean
{
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError))
  {
    return false;
  }

  return erro.code === "P2003" || erro.code === "P2039";
}

function corridaEntreCliques(erro: unknown): boolean
{
  return (
    erro instanceof Prisma.PrismaClientKnownRequestError
    && (erro.code === "P2002" || erro.code === "P2025")
  );
}

export async function alternarSeguir(
  followerId: string,
  followingId: string,
): Promise<ResultadoDoToggle | null>
{
  const prisma = getPrisma();

  const existente = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
    select: { id: true },
  });

  try
  {
    if (existente === null)
    {
      await prisma.follow.create({ data: { followerId, followingId } });
    }
    else
    {
      await prisma.follow.delete({ where: { id: existente.id } });
    }
  }
  catch (erro)
  {
    if (alvoInvalido(erro))
    {
      return null;
    }

    if (!corridaEntreCliques(erro))
    {
      throw erro;
    }
  }

  const total = await prisma.follow.count({ where: { followingId } });

  return { ativo: existente === null, total };
}

export async function alternarCurtidaDoPerfil(
  userId: string,
  profileUserId: string,
): Promise<ResultadoDoToggle | null>
{
  const prisma = getPrisma();

  const existente = await prisma.profileLike.findUnique({
    where: { userId_profileUserId: { userId, profileUserId } },
    select: { id: true },
  });

  try
  {
    if (existente === null)
    {
      await prisma.profileLike.create({ data: { userId, profileUserId } });
    }
    else
    {
      await prisma.profileLike.delete({ where: { id: existente.id } });
    }
  }
  catch (erro)
  {
    if (alvoInvalido(erro))
    {
      return null;
    }

    if (!corridaEntreCliques(erro))
    {
      throw erro;
    }
  }

  const total = await prisma.profileLike.count({ where: { profileUserId } });

  return { ativo: existente === null, total };
}

export async function resumoSocial(
  profileUserId: string,
  viewerId: string | null,
): Promise<ResumoSocial>
{
  const prisma = getPrisma();

  const [seguidores, seguindo, curtidas, sigo, curti] = await Promise.all([
    prisma.follow.count({ where: { followingId: profileUserId } }),
    prisma.follow.count({ where: { followerId: profileUserId } }),
    prisma.profileLike.count({ where: { profileUserId } }),
    viewerId === null
      ? Promise.resolve(0)
      : prisma.follow.count({ where: { followerId: viewerId, followingId: profileUserId } }),
    viewerId === null
      ? Promise.resolve(0)
      : prisma.profileLike.count({ where: { userId: viewerId, profileUserId } }),
  ]);

  return { seguidores, seguindo, curtidas, sigo: sigo > 0, curti: curti > 0 };
}
