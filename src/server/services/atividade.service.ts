/**
 * Caso de uso: o feed da comunidade na home (issue #50). Pede as últimas
 * resenhas e as últimas listas, mescla por data e corta. Uma fonte falhando
 * não derruba a outra — o feed sai com o que respondeu.
 */
import { montarFeed, type ItemDoFeed } from "@/server/domain/atividade";
import {
  listarResenhasDaComunidade,
  type ResenhaDaComunidade,
} from "@/server/repositories/atividade.repository";
import { listarListasPublicas } from "@/server/repositories/lista.repository";

const LIMITE_DO_FEED = 10;

export type ListaDoFeed = {
  listaId: string;
  username: string;
  nome: string;
  totalDeObras: number;
  capas: Array<string | null>;
  quando: Date;
};

export type AtividadeDaComunidade = ItemDoFeed<ResenhaDaComunidade, ListaDoFeed>;

export type DependenciasDoFeed = {
  listarResenhas: (limite: number) => Promise<ResenhaDaComunidade[]>;
  listarListas: (limite: number) => Promise<ListaDoFeed[]>;
};

export async function feedDaComunidade(
  deps: DependenciasDoFeed,
): Promise<AtividadeDaComunidade[]>
{
  const [resenhas, listas] = await Promise.all([
    deps.listarResenhas(LIMITE_DO_FEED).catch(function (): ResenhaDaComunidade[] { return []; }),
    deps.listarListas(LIMITE_DO_FEED).catch(function (): ListaDoFeed[] { return []; }),
  ]);

  return montarFeed(resenhas, listas, LIMITE_DO_FEED);
}

/** A composição de produção. */
export function feedDaComunidadeDoSistema(): Promise<AtividadeDaComunidade[]>
{
  return feedDaComunidade({
    listarResenhas: listarResenhasDaComunidade,
    listarListas: async function (limite)
    {
      const listas = await listarListasPublicas(limite);

      return listas.map(function (lista)
      {
        return {
          listaId: lista.listaId,
          username: lista.username,
          nome: lista.nome,
          totalDeObras: lista.totalDeObras,
          capas: lista.capas,
          quando: lista.criadaEm,
        };
      });
    },
  });
}
