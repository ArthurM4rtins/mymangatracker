// Leitura de usuário NUNCA devolve o passwordHash: os selects são explícitos e o
// teste em `tests/repositories/usuario.privacy.test.ts` trava isso. O único
// caminho com hash é `buscarCredenciaisPorEmail`, consumido só pelo serviço de
// sessão — e devolve o mínimo: id e hash.
import { Prisma } from "@/generated/prisma/client";
import { ErroCampoDuplicado } from "@/server/domain/erros";
import { getPrisma } from "./prisma";

export type NovoUsuario = {
  username: string;
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
};

/**
 * O que a página de perfil (issue #49) vê: sem e-mail. O `id` fica só para o
 * serviço agregar o resto — não sai no DTO do perfil.
 */
export type UsuarioDoPerfil = {
  id: string;
  username: string;
  createdAt: Date;
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

export function buscarUsuarioPorUsername(
  username: string,
): Promise<UsuarioDoPerfil | null>
{
  return getPrisma().user.findUnique({
    where: { username },
    select: { id: true, username: true, createdAt: true },
  });
}

export function buscarCredenciaisPorEmail(
  email: string,
): Promise<CredenciaisDeLogin | null>
{
  return getPrisma().user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
}

/**
 * P2002 é violação de unicidade. Qual índice estourou não tem forma estável no
 * Prisma 7: com driver adapter o nome vem fundo em
 * `meta.driverAdapterError.cause.constraint.index` ("User_username_key"), no
 * engine clássico vem em `meta.target`. Procurar "username" no meta serializado
 * cobre as duas formas — os índices únicos de `User` são só username e email.
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
