/**
 * Traduz a resposta do Kitsu para o nosso `MediaDoAniList` (issue #219).
 *
 * O Kitsu é **tapa-buraco**, não segunda fonte: entra só quando o AniList está
 * fora, e some do caminho quando ele volta. O acervo que queremos espelhar é o
 * do AniList (#215).
 *
 * A regra que sustenta tudo isso é a identidade: o Kitsu entrega o `anilistId`
 * de cada obra no mapeamento, e **obra sem esse id não entra**. Sem ele, a linha
 * seria órfã — o espelho do AniList nunca a reconheceria, e ela ficaria para
 * sempre com o dado pior. Medido em 09/09/2026: 79 de 80 obras trazem o id, em
 * quatro faixas do acervo.
 *
 * Módulo de domínio: puro, sem import do projeto, sem rede. Mesma regra do
 * `anilist-media.ts`: formato que não cabe no nosso modelo faz a obra ser
 * **descartada**, e campo ausente vira **ausência** — nunca um valor chutado que
 * depois vira dado errado no banco.
 */
import type { MediaDoAniList, PaisDeOrigem, TipoMedia } from "./anilist-media";

export type ObraDoKitsu = {
  dados: {
    id: string;
    attributes: Record<string, unknown>;
  };
  /** O `externalId` do mapeamento `anilist/manga`. `null` quando não há. */
  anilistId: string | null;
};

/**
 * O Kitsu modela manhwa e manhua como SUBTIPO; o nosso modelo, como país de
 * origem — a mesma decisão do AniList, registrada no schema. A tradução é
 * direta num sentido só: `manga` não diz o país, e assumir Japão seria inventar.
 */
const TIPO_POR_SUBTIPO: Record<string, { type: TipoMedia; pais?: PaisDeOrigem }> = {
  manga: { type: "MANGA" },
  manhwa: { type: "MANGA", pais: "KR" },
  manhua: { type: "MANGA", pais: "CN" },
  novel: { type: "NOVEL" },
  // #254: os tres viviam descartados, e com eles ia embora cerca de 15% das
  // linhas em buscas japonesas. `oneshot` e `doujin` sao manga japones. `oel`
  // e quadrinho de fora do Japao, Coreia e China — entra sem pais, que e a
  // verdade, e o campo e anulavel justamente para isso. E onde mora, por
  // exemplo, "The Beginning After the End".
  oneshot: { type: "MANGA", pais: "JP" },
  doujin: { type: "MANGA", pais: "JP" },
  oel: { type: "MANGA" },
};

function texto(valor: unknown): string | undefined
{
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : undefined;
}

function inteiro(valor: unknown): number | undefined
{
  // `Number(null)` e `Number("")` dao 0, e o Kitsu manda `chapterCount: null`
  // em obra em andamento (#254). Zero capitulos e' mentira; ausencia e' a
  // verdade, e quem exibe ja sabe omitir o que nao veio.
  if (valor === null || valor === undefined || valor === "")
  {
    return undefined;
  }

  const numero = typeof valor === "number" ? valor : Number(valor);

  return Number.isFinite(numero) ? Math.trunc(numero) : undefined;
}

export function traduzirDoKitsu(obra: ObraDoKitsu): MediaDoAniList | null
{
  // #254: o mapeamento para o AniList deixa de ser exigido. Ele era a unica
  // identidade aceita, e sem ele a obra era descartada -- "The Beginning After
  // the End" nao tem nenhum dos tres registros mapeado. Agora o id do KITSU
  // basta, e quando ha mapeamento a obra carrega os dois nomes.
  const anilistId = inteiro(obra.anilistId);
  const kitsuId = inteiro(obra.dados.id);

  if (kitsuId === undefined || kitsuId <= 0)
  {
    return null;
  }

  const atributos = obra.dados.attributes;
  const formato = TIPO_POR_SUBTIPO[String(atributos.subtype)];

  // `oneshot`, `doujin` e `oel` não existem no nosso modelo. Descarta.
  if (formato === undefined)
  {
    return null;
  }

  const titulos = (atributos.titles ?? {}) as Record<string, unknown>;
  const titleRomaji = texto(atributos.canonicalTitle) ?? texto(titulos.en_jp);

  if (titleRomaji === undefined)
  {
    return null;
  }

  // `medium` (390 px, ~45 KB), não `original`: a original chega a 900 KB por
  // capa, e a lombada mostra 56 px. Medido em 09/09/2026 — tiny 15 KB, small
  // 29 KB, medium 45 KB, large 64 KB, original 908 KB. Vinte originais na
  // vitrine travaram a aba.
  const capa = (atributos.posterImage ?? {}) as Record<string, unknown>;
  const urlDaCapa = texto(capa.medium) ?? texto(capa.small) ?? texto(capa.large) ?? texto(capa.original);
  const inicio = texto(atributos.startDate);
  const nota = inteiro(atributos.averageRating);

  return {
    ...(anilistId === undefined || anilistId <= 0 ? {} : { anilistId }),
    kitsuId,
    type: formato.type,
    titleRomaji,
    ...(formato.pais === undefined ? {} : { countryOfOrigin: formato.pais }),
    ...(texto(titulos.en) === undefined ? {} : { titleEnglish: texto(titulos.en) }),
    ...(texto(titulos.ja_jp) === undefined ? {} : { titleNative: texto(titulos.ja_jp) }),
    ...(urlDaCapa === undefined ? {} : { coverImageUrl: urlDaCapa }),
    ...(texto(atributos.synopsis) === undefined ? {} : { description: texto(atributos.synopsis) }),
    ...(inteiro(atributos.chapterCount) === undefined
      ? {}
      : { chapters: inteiro(atributos.chapterCount) }),
    ...(inicio === undefined ? {} : { startYear: inteiro(inicio.slice(0, 4)) }),
    ...(nota === undefined ? {} : { averageScore: nota }),
  };
}
