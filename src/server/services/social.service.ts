/**
 * Casos de uso: seguir usuário e curtir perfil (issue #74). O alvo chega por
 * username — id de usuário nunca sai no recorte público. Inexistente é
 * nao_encontrado sem tocar no toggle; a si mesmo é decidido no domínio antes
 * do banco; senão toggle e estado final, como a curtida de lista.
 */
import { podeSeRelacionar } from "@/server/domain/social";
import {
  alternarCurtidaDoPerfil,
  alternarSeguir,
  type ResultadoDoToggle,
} from "@/server/repositories/social.repository";
import {
  buscarUsuarioPorUsername,
  type UsuarioDoPerfil,
} from "@/server/repositories/usuario.repository";

export type PedidoSocial = { userId: string; username: string };

export type ResultadoSocial =
  | { estado: "ok"; ativo: boolean; total: number }
  | { estado: "nao_encontrado" }
  | { estado: "a_si_mesmo" };

export type DependenciasSociais = {
  buscarPorUsername: (username: string) => Promise<UsuarioDoPerfil | null>;
  alternar: (userId: string, alvoId: string) => Promise<ResultadoDoToggle | null>;
};

async function alternarRelacao(
  pedido: PedidoSocial,
  deps: DependenciasSociais,
): Promise<ResultadoSocial>
{
  const alvo = await deps.buscarPorUsername(pedido.username);

  if (alvo === null)
  {
    return { estado: "nao_encontrado" };
  }

  if (!podeSeRelacionar(pedido.userId, alvo.id))
  {
    return { estado: "a_si_mesmo" };
  }

  const resultado = await deps.alternar(pedido.userId, alvo.id);

  if (resultado === null)
  {
    return { estado: "nao_encontrado" };
  }

  return { estado: "ok", ativo: resultado.ativo, total: resultado.total };
}

export function seguirUsuario(
  pedido: PedidoSocial,
  deps: DependenciasSociais,
): Promise<ResultadoSocial>
{
  return alternarRelacao(pedido, deps);
}

export function curtirPerfil(
  pedido: PedidoSocial,
  deps: DependenciasSociais,
): Promise<ResultadoSocial>
{
  return alternarRelacao(pedido, deps);
}

/** As composições de produção. */
export function seguirUsuarioDoSistema(pedido: PedidoSocial): Promise<ResultadoSocial>
{
  return seguirUsuario(pedido, {
    buscarPorUsername: buscarUsuarioPorUsername,
    alternar: alternarSeguir,
  });
}

export function curtirPerfilDoSistema(pedido: PedidoSocial): Promise<ResultadoSocial>
{
  return curtirPerfil(pedido, {
    buscarPorUsername: buscarUsuarioPorUsername,
    alternar: alternarCurtidaDoPerfil,
  });
}
