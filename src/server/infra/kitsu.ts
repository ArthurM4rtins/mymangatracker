/**
 * O Kitsu, tapa-buraco enquanto o AniList está fora (issue #219).
 *
 * Entra **sob demanda**: responde à busca que a pessoa fez, e só isso. Não
 * espelha catálogo — o acervo que queremos é o do AniList (#215), e a
 * documentação do Kitsu fala em uso justo, recomendando guardar o que se exibe.
 *
 * O `include=mappings` traz o `anilistId` no MESMO pedido, sem ida extra. É o
 * que permite a obra gravada aqui ser exatamente a linha que o AniList vai
 * atualizar depois.
 */
import { traduzirDoKitsu, type ObraDoKitsu } from "@/server/domain/kitsu-media";
import { semRepetidas, type MediaDoAniList } from "@/server/domain/anilist-media";
import { consultaDoKitsu } from "@/server/domain/kitsu-filtros";
import type { FiltroDoCatalogo } from "@/server/domain/catalogo-filtros";

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

type Resposta = {
  data?: Array<{
    id?: unknown;
    attributes?: unknown;
    relationships?: { mappings?: { data?: Array<{ id?: unknown }> } };
  }>;
  included?: Array<{ id?: unknown; type?: unknown; attributes?: unknown }>;
};

function pedir(caminho: string): Promise<Resposta>
{
  return pedirEm(BASE, caminho);
}

async function pedirEm(base: string, caminho: string): Promise<Resposta>
{
  const resposta = await fetch(`${base}${caminho}`, {
    headers: {
      Accept: "application/vnd.api+json",
      "User-Agent": IDENTIFICACAO,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (!resposta.ok)
  {
    throw new Error(`Kitsu respondeu ${resposta.status}`);
  }

  return (await resposta.json()) as Resposta;
}

/** Junta cada obra ao `anilistId` que veio no mesmo pedido, e traduz. */
function montar(corpo: Resposta): MediaDoAniList[]
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

    for (const referencia of referencias)
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
      },
      anilistId,
    };

    const obra = traduzirDoKitsu(entrada);

    // Obra sem `anilistId` é descartada no domínio: linha órfã que o espelho do
    // AniList nunca reconheceria.
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
 * A conta é da fonte, não do que entregamos: o domínio descarta o que não cabe
 * no nosso modelo (`oneshot`, `oel`, obra sem mapeamento para o AniList), então
 * uma fatia de 60 costuma virar ~50 na tela. Paginar pelo que sobrou abriria
 * buraco ou repetiria obra entre uma página e a seguinte (#228).
 */
const OBRAS_DA_FONTE_POR_PAGINA = 60;

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

  return partes.join("&");
}

/**
 * A busca do Kitsu repete linha entre offsets (#240): pedindo "berserk", os
 * offsets 0 e 20 devolvem as vinte mesmas linhas. A regra por trás disso varia
 * por termo e não é conhecível de fora, então não se tenta adivinhar o passo
 * certo — junta-se a fatia e tira-se a repetida no fim.
 *
 * `temMais` continua vindo da FONTE, pelo lote cheio, e não da contagem do que
 * sobrou: a página cobre uma fatia fixa da fonte, e contar o que restou depois
 * do descarte pararia a paginação cedo demais (a lição de 09/09).
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
  let temMais = false;

  for (let lido = 0; lido < OBRAS_DA_FONTE_POR_PAGINA; lido += POR_PAGINA)
  {
    const offset = inicio + lido;
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

    // Lote cheio: a fonte tinha pelo menos até aqui. Se for o último da fatia,
    // é a nossa pista de que a página seguinte tem o que mostrar.
    temMais = true;
  }

  return { obras: semRepetidas(obras), temMais };
}

/**
 * Uma obra pelo id DO KITSU (#254). É o caminho de quem o AniList não conhece —
 * "The Beginning After the End", por exemplo, não tem mapeamento em nenhum dos
 * três registros dela.
 */
export async function buscarNoKitsuPorId(kitsuId: number): Promise<MediaDoAniList | null>
{
  const corpo = await pedirEm(`${BASE}/${kitsuId}`, "?include=mappings");
  const linha = (corpo as { data?: { id?: unknown; attributes?: unknown } }).data;

  if (linha === undefined)
  {
    return null;
  }

  const mapeamento = (corpo.included ?? []).find(function (incluido)
  {
    const atributos = (incluido.attributes ?? {}) as Record<string, unknown>;

    return incluido.type === "mappings" && atributos.externalSite === "anilist/manga";
  });

  const externo = ((mapeamento?.attributes ?? {}) as Record<string, unknown>).externalId;

  return traduzirDoKitsu({
    dados: {
      id: String(linha.id ?? ""),
      attributes: (linha.attributes ?? {}) as Record<string, unknown>,
    },
    anilistId: typeof externo === "string" ? externo : null,
  });
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

  const obra = (corpo.included ?? []).find(function (incluido)
  {
    return incluido.type === "manga";
  });

  if (obra === undefined)
  {
    return null;
  }

  // O id vem do próprio filtro: foi por ele que chegamos aqui.
  return traduzirDoKitsu({
    dados: {
      id: String(obra.id ?? ""),
      attributes: (obra.attributes ?? {}) as Record<string, unknown>,
    },
    anilistId: String(anilistId),
  });
}
