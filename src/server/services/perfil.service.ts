/**
 * Caso de uso: o perfil de um leitor (issue #49), por username. O id do
 * usuário serve só para agregar aqui dentro — o DTO que sai não o carrega,
 * nem e-mail. A estante (status + capítulo) só entra quando quem olha É o
 * dono; para os outros sai o que a pessoa fez em cima de obras.
 */
import {
  contarPorStatus,
  ordenarAvaliadas,
  type ContagemDaEstante,
  type FiltroDasAvaliadas,
  type StatusDaEstante,
} from "@/server/domain/perfil";
import {
  listarListasDoUsuario,
  contarListasDoUsuario,
  type ListaPublica,
} from "@/server/repositories/lista.repository";
import {
  contarCurtidasDadas,
  contarResenhas,
  listarAvaliadas,
  contarAvaliadas,
  listarResenhasRecentes,
  type AvaliadaDoPerfil,
  type ResenhaDoPerfil,
} from "@/server/repositories/perfil.repository";
import { listarEntradasDoUsuario } from "@/server/repositories/shelf.repository";
import {
  resumoSocial,
  type ResumoSocial,
} from "@/server/repositories/social.repository";
import {
  buscarUsuarioPorUsername,
  type UsuarioDoPerfil,
} from "@/server/repositories/usuario.repository";

const RESENHAS_RECENTES = 5;
// Tetos das leituras públicas do perfil (#135): os números vêm de COUNT.
const AVALIADAS_NO_PERFIL = 200;
const LISTAS_NO_PERFIL = 50;

export type EntradaDaEstanteDoDono = {
  entradaId: string;
  status: StatusDaEstante;
  /** Só o dono vê — nunca sai para outro usuário. */
  progressChapter: string | null;
  obra: {
    chave: string;
    titleRomaji: string;
    titleEnglish: string | null;
    coverImageUrl: string | null;
  };
};

export type EstanteDoDono = {
  contagem: ContagemDaEstante;
  entradas: EntradaDaEstanteDoDono[];
};

export type PerfilDoUsuario = {
  username: string;
  membroDesde: Date;
  souEu: boolean;
  /** Timestamp da última troca da foto (issue #76); `null` sem foto. */
  avatarVersao: number | null;
  numeros: {
    avaliadas: number;
    resenhas: number;
    listas: number;
    curtidasDadas: number;
  };
  /** Já filtrada e ordenada pelo filtro da URL. */
  avaliadas: AvaliadaDoPerfil[];
  resenhasRecentes: ResenhaDoPerfil[];
  listas: ListaPublica[];
  /** `null` para quem não é o dono. */
  estante: EstanteDoDono | null;
  /** Seguidores, seguindo, curtidas e o estado de quem olha (issue #74). */
  social: ResumoSocial;
};

export type PedidoDePerfil = {
  username: string;
  viewerId: string | null;
  filtro: FiltroDasAvaliadas;
};

export type DependenciasDePerfil = {
  buscarPorUsername: (username: string) => Promise<UsuarioDoPerfil | null>;
  listarAvaliadas: (userId: string, limite: number) => Promise<AvaliadaDoPerfil[]>;
  contarAvaliadas: (userId: string) => Promise<number>;
  contarResenhas: (userId: string) => Promise<number>;
  contarCurtidasDadas: (userId: string) => Promise<number>;
  listarResenhas: (userId: string, limite: number) => Promise<ResenhaDoPerfil[]>;
  listarListas: (userId: string, limite: number) => Promise<ListaPublica[]>;
  contarListas: (userId: string) => Promise<number>;
  listarEstante: (userId: string) => Promise<EntradaDaEstanteDoDono[]>;
  resumoSocial: (userId: string, viewerId: string | null) => Promise<ResumoSocial>;
};

export async function perfilDoUsuario(
  pedido: PedidoDePerfil,
  deps: DependenciasDePerfil,
): Promise<PerfilDoUsuario | null>
{
  const usuario = await deps.buscarPorUsername(pedido.username);

  if (usuario === null)
  {
    return null;
  }

  const souEu = pedido.viewerId === usuario.id;

  const [avaliadas, totalDeAvaliadas, resenhas, curtidasDadas, resenhasRecentes, listas, totalDeListas, entradas, social] =
    await Promise.all([
      deps.listarAvaliadas(usuario.id, AVALIADAS_NO_PERFIL),
      deps.contarAvaliadas(usuario.id),
      deps.contarResenhas(usuario.id),
      deps.contarCurtidasDadas(usuario.id),
      deps.listarResenhas(usuario.id, RESENHAS_RECENTES),
      deps.listarListas(usuario.id, LISTAS_NO_PERFIL),
      deps.contarListas(usuario.id),
      souEu ? deps.listarEstante(usuario.id) : Promise.resolve(null),
      deps.resumoSocial(usuario.id, pedido.viewerId),
    ]);

  return {
    username: usuario.username,
    membroDesde: usuario.createdAt,
    souEu,
    avatarVersao: usuario.avatarUpdatedAt?.getTime() ?? null,
    numeros: {
      avaliadas: totalDeAvaliadas,
      resenhas,
      listas: totalDeListas,
      curtidasDadas,
    },
    avaliadas: ordenarAvaliadas(avaliadas, pedido.filtro),
    resenhasRecentes,
    listas,
    estante:
      entradas === null
        ? null
        : { contagem: contarPorStatus(entradas), entradas },
    social,
  };
}

/** A composição de produção. */
export function perfilDoUsuarioDoSistema(
  pedido: PedidoDePerfil,
): Promise<PerfilDoUsuario | null>
{
  return perfilDoUsuario(pedido, {
    buscarPorUsername: buscarUsuarioPorUsername,
    listarAvaliadas,
    contarAvaliadas,
    contarResenhas,
    contarCurtidasDadas,
    listarResenhas: listarResenhasRecentes,
    listarListas: listarListasDoUsuario,
    contarListas: contarListasDoUsuario,
    resumoSocial,
    listarEstante: async function (userId)
    {
      const entradas = await listarEntradasDoUsuario(userId);

      return entradas.map(function (entrada)
      {
        return {
          entradaId: entrada.entradaId,
          status: entrada.status,
          progressChapter: entrada.progressChapter,
          obra: {
            chave: entrada.obra.chave,
            titleRomaji: entrada.obra.titleRomaji,
            titleEnglish: entrada.obra.titleEnglish,
            coverImageUrl: entrada.obra.coverImageUrl,
          },
        };
      });
    },
  });
}
