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
import {
  FATOR_DE_BUSCA,
  MAXIMO_POR_AUTOR,
  noMaximoPorAutor,
} from "@/server/domain/rodizio-de-autoria";

// Dez por trilho (#144): o carrossel e vitrine, nao listagem — quem quiser ver
// tudo vai para /listas. Menos linhas por trilho tambem estreita a janela que
// uma conta so consegue ocupar.
const LIMITE_POR_TRILHO = 10;

export type Vitrine<R, L> = { resenhas: R[]; listas: L[] };

export type ComAutor = { username: string };

export type DependenciasDaVitrine<R, L> = {
  resenhasRecentes: (limite: number) => Promise<R[]>;
  listasRecentes: (limite: number) => Promise<L[]>;
};

function autorDe(item: ComAutor): string
{
  return item.username;
}

function vazioSeFalhar<T>(promessa: Promise<T[]>): Promise<T[]>
{
  return promessa.catch(function (): T[] { return []; });
}

/**
 * Pede mais do que exibe e passa pelo rodízio de autoria (#144): sem isso, uma
 * conta publicando seguido ocupava os dois trilhos sozinha, e repostar de
 * tempos em tempos mantinha assim.
 */
export async function vitrineDaHome<R extends ComAutor, L extends ComAutor>(
  deps: DependenciasDaVitrine<R, L>,
): Promise<Vitrine<R, L>>
{
  const busca = LIMITE_POR_TRILHO * FATOR_DE_BUSCA;

  const [resenhas, listas] = await Promise.all([
    vazioSeFalhar(deps.resenhasRecentes(busca)),
    vazioSeFalhar(deps.listasRecentes(busca)),
  ]);

  return {
    resenhas: noMaximoPorAutor(resenhas, autorDe, MAXIMO_POR_AUTOR, LIMITE_POR_TRILHO),
    listas: noMaximoPorAutor(listas, autorDe, MAXIMO_POR_AUTOR, LIMITE_POR_TRILHO),
  };
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
