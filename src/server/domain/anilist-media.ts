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
};

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

  return media;
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
