/**
 * O Kitsu é a fonte principal do catálogo e dos metadados das obras.
 *
 * Entra **sob demanda**: responde à busca que a pessoa fez, e só isso. Não
 * espelha catálogo. O AniList entra como fallback no serviço que consulta fontes.
 *
 * O `include=mappings` traz o `anilistId` no MESMO pedido, sem ida extra. É o
 * que permite a obra gravada aqui ser exatamente a linha que o AniList vai
 * atualizar depois.
 */
import { traduzirDoKitsu, type ObraDoKitsu, type RecursoKitsu } from "@/server/domain/kitsu-media";
import { semRepetidas, type MediaDoAniList } from "@/server/domain/anilist-media";
import { consultaDoKitsu } from "@/server/domain/kitsu-filtros";
import type { FiltroDoCatalogo } from "@/server/domain/catalogo-filtros";
import { mapearAutorDoKitsu, type AutorDoKitsu } from "@/server/domain/kitsu-autor";

const BASE = "https://kitsu.io/api/edge/manga";
const TIMEOUT_MS = 8000;

/**
 * O Kitsu recusa cliente sem identificação — descoberto apanhando: a primeira
 * bateria de testes levou 403 em TUDO por causa do agente padrão do cliente
 * HTTP. Identificamos o Folunio de verdade; fingir ser navegador seria a saída
 * errada.
 */
const IDENTIFICACAO = "Folunio/1.0 (+https://mymangatracker.vercel.app)";

/** Vinte é o teto do Kitsu: 40 responde 400 "Limit exceeds maximum page size". */
const POR_PAGINA = 20;
const INCLUIR_DETALHES = "mappings,categories,staff.person,mangaStaff.person,mediaRelationships.destination";

/** Sonda pequena, lembrada pelo health para não consultar a cada render. */
export async function pingKitsu(): Promise<"ok">
{
  await pedir("?page%5Blimit%5D=1&fields%5Bmanga%5D=canonicalTitle");
  return "ok";
}

type Resposta = {
  data?: RecursoKitsu[];
  included?: RecursoKitsu[];
};

function pedir(caminho: string): Promise<Resposta>
{
  return pedirEm(BASE, caminho);
}

async function pedirEm(base: string, caminho: string, aceitarAusente = false): Promise<Resposta>
{
  const resposta = await fetch(`${base}${caminho}`, {
    headers: {
      Accept: "application/vnd.api+json",
      "User-Agent": IDENTIFICACAO,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (resposta.status === 404 && aceitarAusente) return {};
  if (!resposta.ok)
  {
    throw new Error(`Kitsu respondeu ${resposta.status}`);
  }

  return (await resposta.json()) as Resposta;
}

/** Perfil e participações na mesma resposta; não faz uma chamada por obra. */
export async function buscarAutorNoKitsu(personId: number): Promise<AutorDoKitsu | null>
{
  const corpo = await pedirEm(`https://kitsu.io/api/edge/people/${personId}`, "?include=staff.media", true);
  return mapearAutorDoKitsu(corpo as unknown as { data?: RecursoKitsu; included?: RecursoKitsu[] });
}

/** Junta cada obra ao `anilistId` que veio no mesmo pedido, e traduz. */
function montar(corpo: Resposta, completo = false): MediaDoAniList[]
{
  const mapeamentos = new Map<string, { site: unknown; id: unknown }>();

  for (const incluido of corpo.included ?? [])
  {
    if (incluido.type === "mappings" && typeof incluido.id === "string")
    {
      const atributos = (incluido.attributes ?? {}) as Record<string, unknown>;
      mapeamentos.set(incluido.id, {
        site: atributos.externalSite,
        id: atributos.externalId,
      });
    }
  }

  const obras: MediaDoAniList[] = [];

  for (const linha of corpo.data ?? [])
  {
    const referencias = linha.relationships?.mappings?.data ?? [];
    let anilistId: string | null = null;

    for (const referencia of Array.isArray(referencias) ? referencias : [])
    {
      const mapeamento = typeof referencia.id === "string"
        ? mapeamentos.get(referencia.id)
        : undefined;

      if (mapeamento?.site === "anilist/manga" && typeof mapeamento.id === "string")
      {
        anilistId = mapeamento.id;
        break;
      }
    }

    const entrada: ObraDoKitsu = {
      dados: {
        id: String(linha.id ?? ""),
        attributes: (linha.attributes ?? {}) as Record<string, unknown>,
        relationships: linha.relationships,
      },
      anilistId,
      incluidos: corpo.included,
      completo,
    };

    const obra = traduzirDoKitsu(entrada);

    // Registros inválidos são descartados. O id do Kitsu basta para a identidade.
    if (obra !== null)
    {
      obras.push(obra);
    }
  }

  return obras;
}

/**
 * A fatia da FONTE que cada página nossa cobre — 60 obras do Kitsu, três
 * pedidos de 20.
 *
 * A conta é da fonte, não do que entregamos: o domínio descarta registros
 * inválidos e a busca pode repetir obras. Paginar pelo que sobrou abriria
 * buraco ou repetiria obra entre uma página e a seguinte (#228).
 */
const OBRAS_DA_FONTE_POR_PAGINA = 60;

/**
 * Teto de pedidos por página. Três lotes fechariam a fatia se a fonte nunca
 * repetisse; os dois a mais cobrem a repetição sem deixar um termo muito
 * repetido pedir para sempre. Com o tempo limite de cada pedido, o pior caso
 * continua dentro do que a tela aguenta.
 */
const LOTES_NO_MAXIMO = 5;

/** Uma página do Kitsu: o que passou no domínio, e se a fonte ainda tem mais. */
export type PaginaDoKitsu = {
  obras: MediaDoAniList[];
  temMais: boolean;
};

/** Os filtros da tela, na sintaxe de query que o Kitsu entende (#252). */
function paramsDoFiltro(filtro: FiltroDoCatalogo): string
{
  const consulta = consultaDoKitsu(filtro);
  const partes = [`sort=${encodeURIComponent(consulta.ordem)}`];

  if (consulta.texto !== undefined)
  {
    partes.push(`filter%5Btext%5D=${encodeURIComponent(consulta.texto)}`);
  }

  if (consulta.subtipo !== undefined)
  {
    partes.push(`filter%5Bsubtype%5D=${encodeURIComponent(consulta.subtipo)}`);
  }

  if (consulta.categoria !== undefined)
  {
    partes.push(`filter%5Bcategories%5D=${encodeURIComponent(consulta.categoria)}`);
  }

  if (consulta.anos !== undefined)
  {
    partes.push(`filter%5Byear%5D=${encodeURIComponent(consulta.anos)}`);
  }

  if (consulta.status) partes.push(`filter%5Bstatus%5D=${encodeURIComponent(consulta.status)}`);
  if (consulta.capitulos) partes.push(`filter%5BchapterCount%5D=${encodeURIComponent(consulta.capitulos)}`);
  return partes.join("&");
}

/**
 * A busca do Kitsu repete linha entre offsets (#240): pedindo "berserk", os
 * offsets 0 e 20 devolvem as vinte mesmas linhas. A regra por trás disso varia
 * por termo e não é conhecível de fora, então não se tenta adivinhar o passo
 * certo — junta-se a fatia e tira-se a repetida no fim.
 *
 * A fatia se enche com o que a fonte tem de DISTINTO (#290), não com um número
 * fixo de lotes. Contar o lote bruto prometia página que não existe — "berserk"
 * devolvia 40 obras com `temMais: true` e a seguinte vinha vazia. Contar só o
 * que sobrou, sem buscar mais, pararia a paginação cedo demais, que foi a lição
 * da #228. Pedir lote extra enquanto a fonte trouxer obra nova serve aos dois.
 *
 * O teto de lotes existe porque termo muito repetido nunca fecharia a fatia: aí
 * a resposta é honesta e diz que acabou.
 *
 * Recebe o FILTRO inteiro, não só o termo (#252): tipo, gênero, década e
 * ordenação sumiam em silêncio enquanto o AniList estava fora.
 */
export async function buscarNoKitsu(
  filtro: FiltroDoCatalogo,
  pagina = 1,
): Promise<PaginaDoKitsu>
{
  const inicio = (Math.max(1, pagina) - 1) * OBRAS_DA_FONTE_POR_PAGINA;
  const params = paramsDoFiltro(filtro);
  const obras: MediaDoAniList[] = [];

  for (let lote = 0; lote < LOTES_NO_MAXIMO; lote += 1)
  {
    const offset = inicio + lote * POR_PAGINA;
    const caminho =
      `?page%5Blimit%5D=${POR_PAGINA}&page%5Boffset%5D=${offset}&include=mappings&${params}`;

    const corpo = await pedir(caminho);
    const nesteLote = corpo.data?.length ?? 0;
    obras.push(...montar(corpo));

    if (nesteLote < POR_PAGINA)
    {
      // A fonte acabou no meio da fatia: não há próxima página.
      return { obras: semRepetidas(obras), temMais: false };
    }

    if (semRepetidas(obras).length >= OBRAS_DA_FONTE_POR_PAGINA)
    {
      // A fatia fechou com obra distinta, e o lote veio cheio: há o que mostrar
      // adiante. Este é o único caminho que promete página seguinte.
      return { obras: semRepetidas(obras).slice(0, OBRAS_DA_FONTE_POR_PAGINA), temMais: true };
    }
  }

  // Gastou os lotes sem fechar a fatia: a fonte tem pouca coisa distinta para
  // este filtro. Prometer mais seria repetir o defeito que a #290 relatou.
  return { obras: semRepetidas(obras), temMais: false };
}

/**
 * Uma obra pelo id DO KITSU (#254). É o caminho de quem o AniList não conhece —
 * "The Beginning After the End", por exemplo, não tem mapeamento em nenhum dos
 * três registros dela.
 */
export async function buscarNoKitsuPorId(kitsuId: number): Promise<MediaDoAniList | null>
{
  const corpo = await pedirEm(`${BASE}/${kitsuId}`, `?include=${INCLUIR_DETALHES}`);
  const linha = (corpo as unknown as { data?: RecursoKitsu }).data;
  return linha ? montar({ data: [linha], included: corpo.included }, true)[0] ?? null : null;
}

/**
 * Uma obra pelo `anilistId`, para a página da obra e para a estante.
 *
 * Vai pelo caminho inverso, em `/mappings`: filtrar a lista de obras por
 * mapeamento **não é permitido** (`"mapping_external_site is not allowed"`, 400),
 * mas a coleção de mapeamentos aceita o filtro e devolve a obra em `include=item`.
 * Conferido contra a API de verdade em 09/09/2026.
 */
export async function buscarNoKitsuPorAnilistId(
  anilistId: number,
): Promise<MediaDoAniList | null>
{
  const corpo = await pedirEm(
    "https://kitsu.io/api/edge/mappings",
    `?filter%5BexternalSite%5D=anilist%2Fmanga`
    + `&filter%5BexternalId%5D=${anilistId}`
    + `&page%5Blimit%5D=1&include=item`,
  );

  const item = corpo.data?.[0]?.relationships?.item?.data;
  if (!item || Array.isArray(item) || item.type !== "manga") return null;
  const obra = corpo.included?.find(r => r.type === item.type && r.id === item.id);
  if (!obra) return null;
  // O relacionamento polimórfico item não aceita includes aninhados (400).
  // A ficha completa precisa ser consultada pelo ID que o mapeamento forneceu.
  const kitsuId = Number(obra.id);
  if (!Number.isSafeInteger(kitsuId) || kitsuId <= 0) return null;
  const completa = await buscarNoKitsuPorId(kitsuId);
  return completa ? { ...completa, anilistId } : null;
}
