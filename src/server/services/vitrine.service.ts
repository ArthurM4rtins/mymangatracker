/**
 * Caso de uso: a vitrine da home (issue #76). Pede de uma vez as resenhas e
 * as listas recentes e as mais curtidas na janela; uma fonte falhando vira
 * lista vazia, as outras saem — como o feed. O "desde" nasce aqui, do agora
 * injetado, para o repositório não saber de calendário.
 */
import {
  listarResenhasDaComunidade,
  listarResenhasMaisCurtidas,
  type ResenhaDaComunidade,
} from "@/server/repositories/atividade.repository";
import {
  listarListasMaisCurtidas,
  listarListasPublicas,
  type ListaPublica,
} from "@/server/repositories/lista.repository";

export const JANELA_DA_VITRINE_DIAS = 7;
const LIMITE_POR_TRILHO = 12;

export type Vitrine<R, L> = {
  resenhas: { recentes: R[]; maisCurtidas: R[] };
  listas: { recentes: L[]; maisCurtidas: L[] };
};

export type DependenciasDaVitrine<R, L> = {
  resenhasRecentes: (limite: number) => Promise<R[]>;
  resenhasMaisCurtidas: (desde: Date, limite: number) => Promise<R[]>;
  listasRecentes: (limite: number) => Promise<L[]>;
  listasMaisCurtidas: (desde: Date, limite: number) => Promise<L[]>;
};

function vazioSeFalhar<T>(promessa: Promise<T[]>): Promise<T[]>
{
  return promessa.catch(function (): T[] { return []; });
}

export async function vitrineDaHome<R, L>(
  agora: Date,
  deps: DependenciasDaVitrine<R, L>,
): Promise<Vitrine<R, L>>
{
  const desde = new Date(agora.getTime() - JANELA_DA_VITRINE_DIAS * 24 * 60 * 60 * 1000);

  const [resenhasRecentes, resenhasMaisCurtidas, listasRecentes, listasMaisCurtidas] =
    await Promise.all([
      vazioSeFalhar(deps.resenhasRecentes(LIMITE_POR_TRILHO)),
      vazioSeFalhar(deps.resenhasMaisCurtidas(desde, LIMITE_POR_TRILHO)),
      vazioSeFalhar(deps.listasRecentes(LIMITE_POR_TRILHO)),
      vazioSeFalhar(deps.listasMaisCurtidas(desde, LIMITE_POR_TRILHO)),
    ]);

  return {
    resenhas: { recentes: resenhasRecentes, maisCurtidas: resenhasMaisCurtidas },
    listas: { recentes: listasRecentes, maisCurtidas: listasMaisCurtidas },
  };
}

export type VitrineDaHome = Vitrine<ResenhaDaComunidade, ListaPublica>;

/** A composição de produção. */
export function vitrineDaHomeDoSistema(): Promise<VitrineDaHome>
{
  return vitrineDaHome(new Date(), {
    resenhasRecentes: listarResenhasDaComunidade,
    resenhasMaisCurtidas: listarResenhasMaisCurtidas,
    listasRecentes: listarListasPublicas,
    listasMaisCurtidas: listarListasMaisCurtidas,
  });
}
