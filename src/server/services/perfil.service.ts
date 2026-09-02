/**
 * Caso de uso: o perfil público de um leitor (issue #49), por username. O id
 * do usuário serve só para agregar aqui dentro — o DTO que sai não o carrega,
 * nem e-mail, nem progresso, nem fonte.
 */
import {
  contagemPorStatus,
  totalDaEstante,
  type ContagemDaEstante,
  type StatusDaEstante,
} from "@/server/domain/perfil";
import {
  listarListasDoUsuario,
  type ListaPublica,
} from "@/server/repositories/lista.repository";
import {
  contarAvaliacoes,
  contarEstantePorStatus,
  listarResenhasRecentes,
  type ResenhaDoPerfil,
} from "@/server/repositories/perfil.repository";
import {
  buscarUsuarioPorUsername,
  type UsuarioDoPerfil,
} from "@/server/repositories/usuario.repository";

const RESENHAS_RECENTES = 5;

export type PerfilPublico = {
  username: string;
  membroDesde: Date;
  estante: ContagemDaEstante;
  totalNaEstante: number;
  avaliacoes: number;
  resenhasRecentes: ResenhaDoPerfil[];
  listas: ListaPublica[];
};

export type DependenciasDePerfilPublico = {
  buscarPorUsername: (username: string) => Promise<UsuarioDoPerfil | null>;
  contarEstante: (
    userId: string,
  ) => Promise<Array<{ status: StatusDaEstante; total: number }>>;
  contarAvaliacoes: (userId: string) => Promise<number>;
  listarResenhas: (userId: string, limite: number) => Promise<ResenhaDoPerfil[]>;
  listarListas: (userId: string) => Promise<ListaPublica[]>;
};

export async function perfilPublico(
  username: string,
  deps: DependenciasDePerfilPublico,
): Promise<PerfilPublico | null>
{
  const usuario = await deps.buscarPorUsername(username);

  if (usuario === null)
  {
    return null;
  }

  const [porStatus, avaliacoes, resenhasRecentes, listas] = await Promise.all([
    deps.contarEstante(usuario.id),
    deps.contarAvaliacoes(usuario.id),
    deps.listarResenhas(usuario.id, RESENHAS_RECENTES),
    deps.listarListas(usuario.id),
  ]);

  const estante = contagemPorStatus(porStatus);

  return {
    username: usuario.username,
    membroDesde: usuario.createdAt,
    estante,
    totalNaEstante: totalDaEstante(estante),
    avaliacoes,
    resenhasRecentes,
    listas,
  };
}

/** A composição de produção. */
export function perfilPublicoDoSistema(username: string): Promise<PerfilPublico | null>
{
  return perfilPublico(username, {
    buscarPorUsername: buscarUsuarioPorUsername,
    contarEstante: contarEstantePorStatus,
    contarAvaliacoes,
    listarResenhas: listarResenhasRecentes,
    listarListas: listarListasDoUsuario,
  });
}
