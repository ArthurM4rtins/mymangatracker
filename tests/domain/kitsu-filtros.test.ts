import { describe, expect, it } from "vitest";

import { consultaDoKitsu } from "@/server/domain/kitsu-filtros";
import { GENEROS, type FiltroDoCatalogo } from "@/server/domain/catalogo-filtros";

/**
 * Os filtros do catálogo traduzidos para o vocabulário do Kitsu (#252).
 *
 * Com o AniList fora, quem responde é o Kitsu — e ele só recebia o termo, então
 * tipo, gênero, década e ordenação sumiam em silêncio. Medido no HTML do
 * servidor em 10/09/2026: `?tipo=manhwa` e `?genero=Action` devolviam as mesmas
 * 59 obras que sem filtro nenhum.
 *
 * Cada valor daqui foi provado contra a API de verdade no mesmo dia, e o
 * cuidado que guiou os testes é este: `filter[categories]` desconhecido é
 * IGNORADO em silêncio pelo Kitsu (devolve a lista padrão), enquanto
 * `filter[subtype]` inválido devolve zero e `sort` inválido devolve 400. Ou
 * seja, gênero errado é o único que passa despercebido — por isso os 17 foram
 * conferidos comparando o conteúdo com a busca sem filtro.
 */
const BASE: FiltroDoCatalogo = { termo: "", ordem: "popular" };

describe("consultaDoKitsu", function ()
{
  it("termo vazio nao manda texto", function ()
  {
    expect(consultaDoKitsu(BASE).texto).toBeUndefined();
  });

  it("termo vira o texto da busca", function ()
  {
    expect(consultaDoKitsu({ ...BASE, termo: "berserk" }).texto).toBe("berserk");
  });

  it("cada tipo vira o subtipo de mesmo nome no Kitsu", function ()
  {
    expect(consultaDoKitsu({ ...BASE, tipo: "manga" }).subtipo).toBe("manga");
    expect(consultaDoKitsu({ ...BASE, tipo: "manhwa" }).subtipo).toBe("manhwa");
    expect(consultaDoKitsu({ ...BASE, tipo: "manhua" }).subtipo).toBe("manhua");
    expect(consultaDoKitsu({ ...BASE, tipo: "novel" }).subtipo).toBe("novel");
  });

  it("sem tipo nao manda subtipo", function ()
  {
    expect(consultaDoKitsu(BASE).subtipo).toBeUndefined();
  });

  it("genero vira identificador em minuscula, com hifen no lugar do espaco", function ()
  {
    expect(consultaDoKitsu({ ...BASE, genero: "Action" }).categoria).toBe("action");
    expect(consultaDoKitsu({ ...BASE, genero: "Slice of Life" }).categoria).toBe("slice-of-life");
    expect(consultaDoKitsu({ ...BASE, genero: "Mahou Shoujo" }).categoria).toBe("mahou-shoujo");
    // Ja vem com hifen: nao pode virar hifen duplo.
    expect(consultaDoKitsu({ ...BASE, genero: "Sci-Fi" }).categoria).toBe("sci-fi");
  });

  it("todo genero da lista vira identificador em formato valido", function ()
  {
    for (const genero of GENEROS)
    {
      const categoria = consultaDoKitsu({ ...BASE, genero }).categoria;

      expect(categoria).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it("decada vira a faixa dos dez anos dela", function ()
  {
    expect(consultaDoKitsu({ ...BASE, decada: 2010 }).anos).toBe("2010..2019");
    expect(consultaDoKitsu({ ...BASE, decada: 1990 }).anos).toBe("1990..1999");
  });

  it("sem decada nao manda faixa de anos", function ()
  {
    expect(consultaDoKitsu(BASE).anos).toBeUndefined();
  });

  it("cada ordenacao vira um criterio que o Kitsu aceita", function ()
  {
    expect(consultaDoKitsu({ ...BASE, ordem: "popular" }).ordem).toBe("-userCount");
    expect(consultaDoKitsu({ ...BASE, ordem: "nota" }).ordem).toBe("-averageRating");
    expect(consultaDoKitsu({ ...BASE, ordem: "recente" }).ordem).toBe("-startDate");
  });

  // O Kitsu nao tem "em alta". Cai em popularidade, que e o vizinho mais
  // proximo — e sort invalido derruba a busca inteira com 400.
  it("em alta cai em popularidade, que e o mais proximo que o Kitsu tem", function ()
  {
    expect(consultaDoKitsu({ ...BASE, ordem: "alta" }).ordem).toBe("-userCount");
  });

  it("os filtros se acumulam, nao se excluem", function ()
  {
    const consulta = consultaDoKitsu({
      termo: "berserk",
      tipo: "manga",
      genero: "Action",
      decada: 1980,
      ordem: "nota",
    });

    expect(consulta).toEqual({
      texto: "berserk",
      subtipo: "manga",
      categoria: "action",
      anos: "1980..1989",
      ordem: "-averageRating",
    });
  });
});
