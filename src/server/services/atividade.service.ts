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
import {
  FATOR_DE_BUSCA,
  MAXIMO_POR_AUTOR,
  noMaximoPorAutor,
} from "@/server/domain/rodizio-de-autoria";

const LIMITE_DO_FEED = 10;

export type ListaDoFeed = {
  listaId: string;
  username: string;
  nome: string;
  totalDeObras: number;
  capas: Array<string | null>;
  curtidas: number;
  quando: Date;
};

export type AtividadeDaComunidade = ItemDoFeed<ResenhaDaComunidade, ListaDoFeed>;

export type DependenciasDoFeed = {
  listarResenhas: (limite: number) => Promise<ResenhaDaComunidade[]>;
  listarListas: (limite: number) => Promise<ListaDoFeed[]>;
};

/**
 * Pede mais do que exibe e passa pelo rodízio de autoria (#144): o feed ordena
 * estritamente por data, então doze resenhas seguidas de uma conta tomavam os
 * dez slots.
 *
 * O rodízio corre DEPOIS da mescla, porque o feed é uma lista só. Aplicado por
 * fonte, a mesma conta somaria duas resenhas mais duas listas — quatro linhas
 * dela, que é o que a issue quer impedir. Por isso `montarFeed` recebe o
 * tamanho da busca, e o corte em `LIMITE_DO_FEED` fica com o rodízio.
 */
export async function feedDaComunidade(
  deps: DependenciasDoFeed,
): Promise<AtividadeDaComunidade[]>
{
  const busca = LIMITE_DO_FEED * FATOR_DE_BUSCA;

  const [resenhas, listas] = await Promise.all([
    deps.listarResenhas(busca).catch(function (): ResenhaDaComunidade[] { return []; }),
    deps.listarListas(busca).catch(function (): ListaDoFeed[] { return []; }),
  ]);

  return noMaximoPorAutor(
    montarFeed(resenhas, listas, busca),
    autorDe,
    MAXIMO_POR_AUTOR,
    LIMITE_DO_FEED,
  );
}

function autorDe(item: { username: string }): string
{
  return item.username;
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
          curtidas: lista.curtidas,
          quando: lista.criadaEm,
        };
      });
    },
  });
}
