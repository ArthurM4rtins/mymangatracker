/**
 * Casos de uso da foto de perfil (issue #76). O dono da sessão define ou
 * remove a própria; qualquer um lê por username. Tipo e tamanho são
 * decididos no domínio antes de tocar no banco.
 */
import { validarAvatar, type ErroDoAvatar } from "@/server/domain/avatar";
import {
  apagarAvatar,
  buscarAvatarPorUsername,
  salvarAvatar,
  type AvatarDoUsuario,
} from "@/server/repositories/usuario.repository";

export type DependenciasDoAvatar = {
  salvar: (userId: string, mime: string, bytes: Uint8Array) => Promise<{ avatarUpdatedAt: Date }>;
  apagar: (userId: string) => Promise<void>;
  buscarPorUsername: (username: string) => Promise<AvatarDoUsuario | null>;
};

export type ResultadoDeDefinir =
  | { estado: "ok"; versao: number }
  | { estado: "invalido"; motivo: ErroDoAvatar };

export async function definirAvatar(
  pedido: { userId: string; mime: string; bytes: Uint8Array },
  deps: DependenciasDoAvatar,
): Promise<ResultadoDeDefinir>
{
  const motivo = validarAvatar(pedido.mime, pedido.bytes.byteLength);

  if (motivo !== null)
  {
    return { estado: "invalido", motivo };
  }

  const salvo = await deps.salvar(pedido.userId, pedido.mime, pedido.bytes);

  return { estado: "ok", versao: salvo.avatarUpdatedAt.getTime() };
}

export async function removerAvatar(
  pedido: { userId: string },
  deps: DependenciasDoAvatar,
): Promise<{ estado: "ok" }>
{
  await deps.apagar(pedido.userId);

  return { estado: "ok" };
}

export type AvatarServido = { bytes: Uint8Array; mime: string; versao: number };

export async function avatarDoUsuario(
  username: string,
  deps: DependenciasDoAvatar,
): Promise<AvatarServido | null>
{
  const foto = await deps.buscarPorUsername(username);

  if (foto === null)
  {
    return null;
  }

  return { bytes: foto.bytes, mime: foto.mime, versao: foto.avatarUpdatedAt.getTime() };
}

const DEPS_DO_SISTEMA: DependenciasDoAvatar = {
  salvar: salvarAvatar,
  apagar: apagarAvatar,
  buscarPorUsername: buscarAvatarPorUsername,
};

/** As composições de produção. */
export function definirAvatarDoSistema(pedido: { userId: string; mime: string; bytes: Uint8Array })
{
  return definirAvatar(pedido, DEPS_DO_SISTEMA);
}

export function removerAvatarDoSistema(pedido: { userId: string })
{
  return removerAvatar(pedido, DEPS_DO_SISTEMA);
}

export function avatarDoUsuarioDoSistema(username: string)
{
  return avatarDoUsuario(username, DEPS_DO_SISTEMA);
}
