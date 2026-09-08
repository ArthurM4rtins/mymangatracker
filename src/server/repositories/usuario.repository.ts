// Leitura de usuário NUNCA devolve o passwordHash: os selects são explícitos e o
// teste em `tests/repositories/usuario.privacy.test.ts` trava isso. O único
// caminho com hash é `buscarCredenciaisPorEmail`, consumido só pelo serviço de
// sessão — e devolve o mínimo: id e hash.
import { Prisma } from "@/generated/prisma/client";
import { ErroCampoDuplicado } from "@/server/domain/erros";
import { normalizarUsername } from "@/server/domain/username";
import { getPrisma } from "./prisma";

export type NovoUsuario = {
  username: string;
  /** A identidade (#114): quem grava é o serviço, pela regra do domínio. */
  usernameNormalizado: string;
  email: string;
  passwordHash: string;
};

/** O que qualquer camada de leitura pode ver de um usuário. */
export type UsuarioPublico = {
  id: string;
  username: string;
  email: string;
};

export type CredenciaisDeLogin = {
  id: string;
  passwordHash: string;
  /** Idioma escolhido pela pessoa, ou null se ela nunca escolheu (#116). */
  locale: string | null;
  /** Para o token novo nascer com a versão atual (#137). */
  tokenVersion: number;
};

/**
 * O que a página de perfil (issue #49) vê: sem e-mail. O `id` fica só para o
 * serviço agregar o resto — não sai no DTO do perfil.
 */
export type UsuarioDoPerfil = {
  id: string;
  username: string;
  createdAt: Date;
  /** Versão da foto (issue #76); `null` sem foto. Bytes nunca vêm aqui. */
  avatarUpdatedAt: Date | null;
};

/** A foto em si (issue #76) — só sai pela rota de imagem. */
export type AvatarDoUsuario = {
  bytes: Uint8Array;
  mime: string;
  avatarUpdatedAt: Date;
};

const SELECT_PUBLICO = { id: true, username: true, email: true } as const;

export async function criarUsuario(dados: NovoUsuario): Promise<UsuarioPublico>
{
  try
  {
    return await getPrisma().user.create({
      data: dados,
      select: SELECT_PUBLICO,
    });
  }
  catch (erro)
  {
    throw traduzirDuplicidade(erro);
  }
}

export function buscarUsuarioPorId(id: string): Promise<UsuarioPublico | null>
{
  return getPrisma().user.findUnique({
    where: { id },
    select: SELECT_PUBLICO,
  });
}

/** Resolve em qualquer caixa (#114): a chave é o username normalizado. */
export function buscarUsuarioPorUsername(
  username: string,
): Promise<UsuarioDoPerfil | null>
{
  return getPrisma().user.findUnique({
    where: { usernameNormalizado: normalizarUsername(username) },
    select: { id: true, username: true, createdAt: true, avatarUpdatedAt: true },
  });
}

export async function salvarAvatar(
  userId: string,
  mime: string,
  bytes: Uint8Array,
): Promise<{ avatarUpdatedAt: Date }>
{
  const linha = await getPrisma().user.update({
    where: { id: userId },
    // O client do Prisma exige Uint8Array sobre ArrayBuffer; a cópia garante isso.
    data: { avatar: new Uint8Array(bytes), avatarMime: mime, avatarUpdatedAt: new Date() },
    select: { avatarUpdatedAt: true },
  });

  return { avatarUpdatedAt: linha.avatarUpdatedAt as Date };
}

export async function apagarAvatar(userId: string): Promise<void>
{
  await getPrisma().user.update({
    where: { id: userId },
    data: { avatar: null, avatarMime: null, avatarUpdatedAt: null },
    select: { id: true },
  });
}

/** `null` quando o usuário não existe ou não tem foto. */
export async function buscarAvatarPorUsername(
  username: string,
): Promise<AvatarDoUsuario | null>
{
  const linha = await getPrisma().user.findUnique({
    where: { usernameNormalizado: normalizarUsername(username) },
    select: { avatar: true, avatarMime: true, avatarUpdatedAt: true },
  });

  if (linha === null || linha.avatar === null || linha.avatarMime === null || linha.avatarUpdatedAt === null)
  {
    return null;
  }

  return { bytes: linha.avatar, mime: linha.avatarMime, avatarUpdatedAt: linha.avatarUpdatedAt };
}

export function buscarCredenciaisPorEmail(
  email: string,
): Promise<CredenciaisDeLogin | null>
{
  return getPrisma().user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, locale: true, tokenVersion: true },
  });
}

/**
 * A mesma busca pela outra porta de entrada (#166). A chave é
 * `usernameNormalizado`, única desde a #114 — nunca `username`, que guarda o
 * que a pessoa digitou e existe só para exibição.
 */
export function buscarCredenciaisPorUsername(
  usernameNormalizado: string,
): Promise<CredenciaisDeLogin | null>
{
  return getPrisma().user.findUnique({
    where: { usernameNormalizado },
    select: { id: true, passwordHash: true, locale: true, tokenVersion: true },
  });
}

/**
 * P2002 é violação de unicidade. Qual índice estourou não tem forma estável no
 * Prisma 7: com driver adapter o nome vem fundo em
 * `meta.driverAdapterError.cause.constraint.index` ("User_username_key"), no
 * engine clássico vem em `meta.target`. Procurar "username" no meta serializado
 * cobre as duas formas — os índices únicos de `User` são username,
 * usernameNormalizado (que contém "username") e email.
 * O código do Prisma morre aqui — para cima sobe erro de domínio.
 */
function traduzirDuplicidade(erro: unknown): Error
{
  if (
    erro instanceof Prisma.PrismaClientKnownRequestError &&
    erro.code === "P2002"
  )
  {
    const meta = JSON.stringify(erro.meta ?? "");

    return meta.includes("username")
      ? new ErroCampoDuplicado("username")
      : new ErroCampoDuplicado("email");
  }

  return erro instanceof Error ? erro : new Error(String(erro));
}

/** Grava o idioma da interface escolhido pela pessoa (#116, fase 5). */
export async function salvarIdioma(userId: string, locale: string): Promise<void>
{
  await getPrisma().user.update({
    where: { id: userId },
    data: { locale },
  });
}

/**
 * A versão que o token precisa carregar para valer (#137). `null` quando o
 * usuário não existe mais — sessão de conta apagada não vale.
 */
export async function buscarVersaoDoToken(userId: string): Promise<number | null>
{
  const linha = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });

  return linha === null ? null : linha.tokenVersion;
}

/** Sair: todo token assinado com a versão anterior deixa de valer (#137). */
export async function incrementarVersaoDoToken(userId: string): Promise<void>
{
  await getPrisma().user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}
