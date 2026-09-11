/**
 * Traduz a resposta do Kitsu para o nosso `MediaDoAniList` (issue #219).
 *
 * O Kitsu é a fonte principal. Quando fornece mapeamento para o AniList,
 * guardamos os dois ids para preservar links existentes e permitir fallback.
 * Obras sem mapeamento continuam identificadas pelo próprio id do Kitsu.
 *
 * Módulo de domínio: puro, sem import do projeto, sem rede. Mesma regra do
 * `anilist-media.ts`: formato que não cabe no nosso modelo faz a obra ser
 * **descartada**, e campo ausente vira **ausência** — nunca um valor chutado que
 * depois vira dado errado no banco.
 */
import type { MediaDoAniList, PaisDeOrigem, TipoMedia } from "./anilist-media";
import { GENEROS } from "./catalogo-filtros";
import { dataDePublicacao, RELACOES, STATUS_PUBLICACAO, type DetalhesDaObra, type ObraRelacionada } from "./detalhes-da-obra";

export type RecursoKitsu = {
  id?: unknown;
  type?: unknown;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { id?: unknown; type?: unknown } | Array<{ id?: unknown; type?: unknown }> | null }>;
};

export type ObraDoKitsu = {
  dados: {
    id: string;
    attributes: Record<string, unknown>;
    relationships?: RecursoKitsu["relationships"];
  };
  /** O `externalId` do mapeamento `anilist/manga`. `null` quando não há. */
  anilistId: string | null;
  incluidos?: RecursoKitsu[];
  completo?: boolean;
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

  // Subtipo desconhecido não pode ser representado no modelo.
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
  const banner = (atributos.coverImage ?? {}) as Record<string, unknown>;
  const bannerImageUrl = texto(banner.large_webp) ?? texto(banner.large) ?? texto(banner.original);
  const ligados = relacionamentosDaObra(obra);
  const categories = ligados(obra.dados, "categories").flatMap(r => typeof r.attributes?.slug === "string" ? [r.attributes.slug] : []);
  const genres = GENEROS.filter(g => categories.includes(g.toLowerCase().replace(/\s+/g, "-")));
  const autores = [...ligados(obra.dados, "staff"), ...ligados(obra.dados, "mangaStaff")].flatMap(staff => {
    const papel = texto(staff.attributes?.role);
    const pessoa = ligados(staff, "person")[0];
    const nome = texto(pessoa?.attributes?.name);
    const id = inteiro(pessoa?.id);
    return papel && /story|art|author/i.test(papel) && nome && id && id > 0
      ? [{ kitsuPersonId: id, nome, papel }] : [];
  }).filter((a, i, lista) => lista.findIndex(b => b.kitsuPersonId === a.kitsuPersonId) === i);
  const related: ObraRelacionada[] = ligados(obra.dados, "mediaRelationships").flatMap(rel => {
    const destino = ligados(rel, "destination")[0];
    if (destino?.type !== "manga" || String(destino.id) === String(kitsuId)) return [];
    const media = traduzirDoKitsu({ dados: { id: String(destino.id), attributes: destino.attributes ?? {} }, anilistId: null });
    if (!media) return [];
    const role = rel.attributes?.role;
    const relacao = RELACOES.find(r => r === role) ?? "other";
    return [{ chave: `kitsu:${media.kitsuId}`, titulo: media.titleEnglish ?? media.titleRomaji, capa: media.coverImageUrl ?? null, tipo: media.type, relacao }];
  }).filter((r, i, lista) => lista.findIndex(b => b.chave === r.chave) === i).slice(0, 12);
  const volumes = inteiro(atributos.volumeCount);
  const status = STATUS_PUBLICACAO.find(s => s === atributos.status);
  const aliases = [...new Set([...Object.values(titulos), ...(Array.isArray(atributos.abbreviatedTitles) ? atributos.abbreviatedTitles : [])].flatMap(t => texto(t) ? [texto(t)!] : []))].filter(t => t !== titleRomaji).slice(0, 30);
  const details: DetalhesDaObra | undefined = obra.completo ? {
    version: 1, aliases, categories, related,
    ...(status ? { status } : {}),
    ...(volumes && volumes > 0 ? { volumes } : {}),
    ...(dataDePublicacao(atributos.startDate) ? { startDate: dataDePublicacao(atributos.startDate) } : {}),
    ...(dataDePublicacao(atributos.endDate) ? { endDate: dataDePublicacao(atributos.endDate) } : {}),
    subtype: String(atributos.subtype),
  } : undefined;

  return {
    ...(anilistId === undefined || anilistId <= 0 ? {} : { anilistId }),
    kitsuId,
    type: formato.type,
    titleRomaji,
    ...(bannerImageUrl ? { bannerImageUrl } : {}),
    ...(genres.length ? { genres: [...genres] } : {}),
    ...(autores.length ? { autores } : {}),
    ...(details ? { details } : {}),
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

function relacionamentosDaObra(obra: ObraDoKitsu)
{
  const indice = new Map((obra.incluidos ?? []).map(r => [`${r.type}:${r.id}`, r]));
  return function ligados(recurso: RecursoKitsu, nome: string): RecursoKitsu[] {
    const dados = recurso.relationships?.[nome]?.data;
    return (Array.isArray(dados) ? dados : dados ? [dados] : []).flatMap(ref => {
      const item = indice.get(`${ref.type}:${ref.id}`);
      return item ? [item] : [];
    });
  };
}
