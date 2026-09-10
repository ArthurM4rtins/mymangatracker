/**
 * Os filtros do catálogo traduzidos para o vocabulário do Kitsu (#252).
 *
 * Com o AniList fora (#215), quem responde é o Kitsu — e ele recebia só o
 * termo, então tipo, gênero, década e ordenação sumiam em silêncio. Medido no
 * HTML do servidor em 10/09/2026: `?tipo=manhwa` e `?genero=Action` devolviam
 * as mesmas 59 obras que sem filtro nenhum.
 *
 * Cada valor daqui foi provado contra a API de verdade no mesmo dia. O que
 * guiou os testes foi descobrir como o Kitsu recusa cada coisa:
 *
 * | filtro | valor inválido |
 * |---|---|
 * | `filter[subtype]` | devolve zero obras |
 * | `filter[year]` | devolve zero obras |
 * | `sort` | devolve 400 |
 * | `filter[categories]` | **é ignorado em silêncio**, devolve a lista padrão |
 *
 * O gênero é o único que passa despercebido quando erra, então os dezessete
 * foram conferidos comparando o CONTEÚDO com a busca sem filtro, e não pelo
 * status da resposta.
 *
 * Aqui só mora a tradução: quem monta a URL é a infra, que é quem conhece a
 * sintaxe de `filter[...]`.
 */
import type { FiltroDoCatalogo, OrdemDoCatalogo } from "./catalogo-filtros";

export type ConsultaDoKitsu = {
  texto?: string;
  subtipo?: string;
  categoria?: string;
  /** A faixa de anos, no formato que o Kitsu espera: `2010..2019`. */
  anos?: string;
  ordem: string;
};

const ANOS_DA_DECADA = 9;

/**
 * O Kitsu não tem "em alta": `alta` cai em popularidade, que é o vizinho mais
 * próximo. Chutar um critério inexistente não é opção — `sort` inválido derruba
 * a busca inteira com 400, e ela é justamente a que já está em contingência.
 */
const ORDEM_DO_KITSU: Record<OrdemDoCatalogo, string> = {
  popular: "-userCount",
  nota: "-averageRating",
  alta: "-userCount",
  recente: "-startDate",
};

/**
 * O nome do gênero vira identificador: minúscula, espaço vira hífen. "Sci-Fi"
 * já chega com hífen e continua com um só.
 */
function identificadorDoGenero(genero: string): string
{
  return genero.toLowerCase().replace(/\s+/g, "-");
}

export function consultaDoKitsu(filtro: FiltroDoCatalogo): ConsultaDoKitsu
{
  const termo = filtro.termo.trim();

  return {
    ...(termo === "" ? {} : { texto: termo }),
    ...(filtro.tipo === undefined ? {} : { subtipo: filtro.tipo }),
    ...(filtro.genero === undefined
      ? {}
      : { categoria: identificadorDoGenero(filtro.genero) }),
    ...(filtro.decada === undefined
      ? {}
      : { anos: `${filtro.decada}..${filtro.decada + ANOS_DA_DECADA}` }),
    ordem: ORDEM_DO_KITSU[filtro.ordem],
  };
}
