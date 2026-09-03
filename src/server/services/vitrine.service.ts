/**
 * Caso de uso: a vitrine da home (issue #76). Pede de uma vez as resenhas e
 * as listas recentes; uma fonte falhando vira lista vazia, a outra sai —
 * como o feed.
 */
import {
  listarResenhasDaComunidade,
  type ResenhaDaComunidade,
} from "@/server/repositories/atividade.repository";
import {
  listarListasPublicas,
  type ListaPublica,
} from "@/server/repositories/lista.repository";

const LIMITE_POR_TRILHO = 12;

export type Vitrine<R, L> = { resenhas: R[]; listas: L[] };

export type DependenciasDaVitrine<R, L> = {
  resenhasRecentes: (limite: number) => Promise<R[]>;
  listasRecentes: (limite: number) => Promise<L[]>;
};

function vazioSeFalhar<T>(promessa: Promise<T[]>): Promise<T[]>
{
  return promessa.catch(function (): T[] { return []; });
}

export async function vitrineDaHome<R, L>(
  deps: DependenciasDaVitrine<R, L>,
): Promise<Vitrine<R, L>>
{
  const [resenhas, listas] = await Promise.all([
    vazioSeFalhar(deps.resenhasRecentes(LIMITE_POR_TRILHO)),
    vazioSeFalhar(deps.listasRecentes(LIMITE_POR_TRILHO)),
  ]);

  return { resenhas, listas };
}

export type VitrineDaHome = Vitrine<ResenhaDaComunidade, ListaPublica>;

/** A composição de produção. */
export function vitrineDaHomeDoSistema(): Promise<VitrineDaHome>
{
  return vitrineDaHome({
    resenhasRecentes: listarResenhasDaComunidade,
    listasRecentes: listarListasPublicas,
  });
}
