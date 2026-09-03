/**
 * Caso de uso: o recorte público de um usuário — o que a home usa para
 * cumprimentar. O repositório garante que hash nunca sai; aqui só se repassa.
 */
import {
  buscarUsuarioPorId,
  type UsuarioPublico,
} from "@/server/repositories/usuario.repository";

export type DependenciasDePerfil = {
  buscarPorId: (id: string) => Promise<UsuarioPublico | null>;
};

export function perfilDoUsuario(
  userId: string,
  deps: DependenciasDePerfil,
): Promise<UsuarioPublico | null>
{
  return deps.buscarPorId(userId);
}

/** A composição de produção. */
export function perfilDoUsuarioDoSistema(
  userId: string,
): Promise<UsuarioPublico | null>
{
  return perfilDoUsuario(userId, { buscarPorId: buscarUsuarioPorId });
}
