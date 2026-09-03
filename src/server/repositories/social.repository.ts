/**
 * Seguir e curtir perfil (issue #74). Toggle no mesmo desenho da curtida de
 * lista: `null` quando o alvo não existe (FK estoura no create), senão o
 * estado final e o total. O resumo sai por id de usuário e nunca carrega
 * e-mail nem id de terceiros — só números e o estado de quem olha.
 */
import { getPrisma } from "./prisma";

export type ResultadoDoToggle = { ativo: boolean; total: number };

export type ResumoSocial = {
  seguidores: number;
  seguindo: number;
  curtidas: number;
  /** Estado de quem olha; `false` para anônimo e para o próprio dono. */
  sigo: boolean;
  curti: boolean;
};

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
  catch
  {
    // FK ou CHECK: alvo não existe ou é o próprio usuário.
    return null;
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
  catch
  {
    return null;
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
