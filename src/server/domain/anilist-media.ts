/**
 * Traducao da resposta do AniList para o formato do nosso `Media`.
 *
 * O AniList e mais largo que o nosso modelo: devolve formatos que nao temos
 * (`MUSIC`) e paises que o enum nao cobre (`US`, `TW`). A regra aqui e nao
 * inventar: formato que nao cabe faz o registro ser **descartado**, e pais que
 * nao cabe vira **ausencia** — nunca um valor chutado que depois vira dado errado
 * no banco.
 *
 * Modulo de dominio: puro, sem import do projeto, sem rede.
 */

export type TipoMedia = "MANGA" | "NOVEL";
export type PaisDeOrigem = "JP" | "KR" | "CN";

export type AutorDaObra = {
  anilistStaffId: number;
  nome: string;
  papel: string;
};

export type MediaDoAniList = {
  anilistId: number;
  type: TipoMedia;
  titleRomaji: string;
  countryOfOrigin?: PaisDeOrigem;
  titleEnglish?: string;
  titleNative?: string;
  coverImageUrl?: string;
  description?: string;
  chapters?: number;
  bannerImageUrl?: string;
  startYear?: number;
  genres?: string[];
  averageScore?: number;
  autores?: AutorDaObra[];
};

/** Papéis do staff que contam como autoria — o resto (tradução etc.) fica fora. */
const PAPEIS_DE_AUTOR = ["Story", "Art"];

const TIPO_POR_FORMATO: Record<string, TipoMedia> = {
  MANGA: "MANGA",
  ONE_SHOT: "MANGA",
  NOVEL: "NOVEL",
};

const PAISES: PaisDeOrigem[] = ["JP", "KR", "CN"];

/**
 * Mapeia um registro. Devolve `null` quando o registro nao da para representar —
 * sem id, sem titulo romaji, ou com formato fora do nosso enum.
 */
export function mapearMedia(bruto: unknown): MediaDoAniList | null
{
  if (!ehObjeto(bruto))
  {
    return null;
  }

  const anilistId = bruto.id;
  const titulo = ehObjeto(bruto.title) ? bruto.title : {};
  const titleRomaji = titulo.romaji;

  if (typeof anilistId !== "number" || typeof titleRomaji !== "string")
  {
    return null;
  }

  const type = typeof bruto.format === "string" ? TIPO_POR_FORMATO[bruto.format] : undefined;

  if (type === undefined)
  {
    return null;
  }

  const media: MediaDoAniList = { anilistId, type, titleRomaji };

  const pais = bruto.countryOfOrigin;

  if (typeof pais === "string" && (PAISES as string[]).includes(pais))
  {
    media.countryOfOrigin = pais as PaisDeOrigem;
  }

  if (typeof titulo.english === "string")
  {
    media.titleEnglish = titulo.english;
  }

  if (typeof titulo.native === "string")
  {
    media.titleNative = titulo.native;
  }

  const capa = ehObjeto(bruto.coverImage) ? bruto.coverImage.large : undefined;

  if (typeof capa === "string")
  {
    media.coverImageUrl = capa;
  }

  if (typeof bruto.description === "string")
  {
    media.description = semHtml(bruto.description);
  }

  if (typeof bruto.chapters === "number")
  {
    media.chapters = bruto.chapters;
  }

  const banner = bruto.bannerImage;

  if (typeof banner === "string")
  {
    media.bannerImageUrl = banner;
  }

  const inicio = ehObjeto(bruto.startDate) ? bruto.startDate.year : undefined;

  if (typeof inicio === "number")
  {
    media.startYear = inicio;
  }

  if (Array.isArray(bruto.genres))
  {
    const generos = bruto.genres.filter(function (g): g is string
    {
      return typeof g === "string";
    });

    if (generos.length > 0)
    {
      media.genres = generos;
    }
  }

  if (typeof bruto.averageScore === "number")
  {
    media.averageScore = bruto.averageScore;
  }

  const autores = mapearAutores(bruto.staff);

  if (autores.length > 0)
  {
    media.autores = autores;
  }

  return media;
}

function mapearAutores(staff: unknown): AutorDaObra[]
{
  if (!ehObjeto(staff) || !Array.isArray(staff.edges))
  {
    return [];
  }

  const autores: AutorDaObra[] = [];

  staff.edges.forEach(function (edge)
  {
    if (!ehObjeto(edge) || typeof edge.role !== "string" || !ehObjeto(edge.node))
    {
      return;
    }

    const papel = edge.role;

    if (!PAPEIS_DE_AUTOR.some(function (p) { return papel.includes(p); }))
    {
      return;
    }

    const id = edge.node.id;
    const nome = ehObjeto(edge.node.name) ? edge.node.name.full : undefined;

    if (typeof id === "number" && typeof nome === "string")
    {
      autores.push({ anilistStaffId: id, nome, papel });
    }
  });

  return autores;
}

/**
 * Extrai a lista de uma resposta de busca, descartando o que nao mapeia.
 *
 * Resposta com `errors` do GraphQL, ou em formato inesperado, vira lista vazia —
 * a tela mostra "nada encontrado" em vez de estourar.
 */
export function mapearBusca(resposta: unknown): MediaDoAniList[]
{
  if (!ehObjeto(resposta) || !ehObjeto(resposta.data))
  {
    return [];
  }

  const page = resposta.data.Page;

  if (!ehObjeto(page) || !Array.isArray(page.media))
  {
    return [];
  }

  const mapeados: MediaDoAniList[] = [];

  page.media.forEach(function (item)
  {
    const media = mapearMedia(item);

    if (media !== null)
    {
      mapeados.push(media);
    }
  });

  return mapeados;
}

/**
 * Extrai as obras recomendadas da resposta de `recommendations` do AniList.
 * Resposta torta vira lista vazia — a seção de similares some, a página fica.
 */
export function mapearRecomendacoes(resposta: unknown): MediaDoAniList[]
{
  if (!ehObjeto(resposta) || !ehObjeto(resposta.data))
  {
    return [];
  }

  const page = resposta.data.Page;

  if (!ehObjeto(page) || !Array.isArray(page.media))
  {
    return [];
  }

  const obra = page.media[0];

  if (!ehObjeto(obra) || !ehObjeto(obra.recommendations))
  {
    return [];
  }

  const nodes = obra.recommendations.nodes;

  if (!Array.isArray(nodes))
  {
    return [];
  }

  const mapeadas: MediaDoAniList[] = [];

  nodes.forEach(function (node)
  {
    if (!ehObjeto(node))
    {
      return;
    }

    const media = mapearMedia(node.mediaRecommendation);

    if (media !== null)
    {
      mapeadas.push(media);
    }
  });

  return mapeadas;
}

export type ObraDoAutor = {
  anilistId: number;
  titleRomaji: string;
  titleEnglish: string | null;
  coverImageUrl: string | null;
  startYear: number | null;
  papel: string;
};

export type AutorDoAniList = {
  staffId: number;
  nome: string;
  nomeNativo: string | null;
  imagemUrl: string | null;
  descricao: string | null;
  obras: ObraDoAutor[];
};

/**
 * Papéis de autoria no `staffRole` do AniList (issue #69): Story, Art,
 * Story & Art, Original Creator, Original Story — com ou sem sufixo entre
 * parênteses ("Story & Art (vols 1-41)"). Assistência, ilustração de novel,
 * produção e afins ficam de fora da página do autor.
 */
const PAPEL_DE_AUTORIA = /^(Story & Art|Story|Art|Original Creator|Original Story)(\s*\(.*\))?$/;

export function ehPapelDeAutoria(papel: string): boolean
{
  return PAPEL_DE_AUTORIA.test(papel.trim());
}

/**
 * O perfil do autor a partir de `Page.staff` (issue #43) — por `Page` porque
 * `Staff(id:)` direto responde 404 com `errors` para id inexistente,
 * indistinguível de rate limit (mesmo caso do POR_ID; probe de 01/09).
 * A mesma obra chega uma vez por papel (Story, Art) — fica a primeira de
 * autoria; papel secundário (assistente etc.) não entra, e o filtro roda
 * antes da dedup para a obra com edge Assistant + edge Story não sumir. Bio
 * perde HTML e o markdown de link; `null` quando o staff não existe.
 */
export function mapearAutor(resposta: unknown): AutorDoAniList | null
{
  if (!ehObjeto(resposta) || !ehObjeto(resposta.data))
  {
    return null;
  }

  const page = resposta.data.Page;

  if (!ehObjeto(page) || !Array.isArray(page.staff))
  {
    return null;
  }

  const staff = page.staff[0];

  if (!ehObjeto(staff))
  {
    return null;
  }

  const staffId = staff.id;
  const nomes = ehObjeto(staff.name) ? staff.name : {};
  const nome = nomes.full;

  if (typeof staffId !== "number" || typeof nome !== "string")
  {
    return null;
  }

  const imagem = ehObjeto(staff.image) ? staff.image.large : undefined;
  const descricao =
    typeof staff.description === "string" ? semMarkdownDeLink(semHtml(staff.description)) : null;

  const obras: ObraDoAutor[] = [];
  const vistos = new Set<number>();
  const edges = ehObjeto(staff.staffMedia) ? staff.staffMedia.edges : undefined;

  if (Array.isArray(edges))
  {
    edges.forEach(function (edge)
    {
      if (!ehObjeto(edge) || !ehObjeto(edge.node))
      {
        return;
      }

      const node = edge.node;
      const anilistId = node.id;
      const titulo = ehObjeto(node.title) ? node.title : {};
      const papel = typeof edge.staffRole === "string" ? edge.staffRole : "";

      if (
        typeof anilistId !== "number" ||
        typeof titulo.romaji !== "string" ||
        !ehPapelDeAutoria(papel) ||
        vistos.has(anilistId)
      )
      {
        return;
      }

      vistos.add(anilistId);

      const capa = ehObjeto(node.coverImage) ? node.coverImage.large : undefined;
      const inicio = ehObjeto(node.startDate) ? node.startDate.year : undefined;

      obras.push({
        anilistId,
        titleRomaji: titulo.romaji,
        titleEnglish: typeof titulo.english === "string" ? titulo.english : null,
        coverImageUrl: typeof capa === "string" ? capa : null,
        startYear: typeof inicio === "number" ? inicio : null,
        papel,
      });
    });
  }

  return {
    staffId,
    nome,
    nomeNativo: typeof nomes.native === "string" ? nomes.native : null,
    imagemUrl: typeof imagem === "string" ? imagem : null,
    descricao,
    obras,
  };
}

/** O AniList usa markdown de link na bio do staff — fica só o texto. */
function semMarkdownDeLink(texto: string): string
{
  return texto.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim();
}

/**
 * Tira as tags da descricao. O AniList devolve `<br>` e `<i>` mesmo com
 * `asHtml: false`, e renderizar isso como HTML seria injecao de conteudo de
 * terceiro na nossa pagina.
 */
function semHtml(texto: string): string
{
  return texto
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function ehObjeto(valor: unknown): valor is Record<string, unknown>
{
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}
