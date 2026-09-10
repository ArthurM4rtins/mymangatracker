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
import type { MediaDoAniList } from "@/server/domain/anilist-media";

const BASE = "https://kitsu.io/api/edge/manga";
const TIMEOUT_MS = 8000;

/**
 * O Kitsu recusa cliente sem identificação — descoberto apanhando: a primeira
 * bateria de testes levou 403 em TUDO por causa do agente padrão do cliente
 * HTTP. Identificamos o Kidoku de verdade; fingir ser navegador seria a saída
 * errada.
 */
const IDENTIFICACAO = "Kidoku/1.0 (+https://mymangatracker.vercel.app)";

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
 * Quantas obras uma página nossa tem. O Kitsu entrega no máximo 20 por pedido,
 * então cada página nossa são dois pedidos dele, em sequência — o segundo só
 * sai se o primeiro veio cheio.
 */
export const OBRAS_POR_PAGINA = 36;

export async function buscarNoKitsu(termo: string, pagina = 1): Promise<MediaDoAniList[]>
{
  const limpo = termo.trim();
  const inicio = (Math.max(1, pagina) - 1) * OBRAS_POR_PAGINA;
  const obras: MediaDoAniList[] = [];

  for (let offset = inicio; offset < inicio + OBRAS_POR_PAGINA; offset += POR_PAGINA)
  {
    const limite = Math.min(POR_PAGINA, inicio + OBRAS_POR_PAGINA - offset);
    const base = `?page%5Blimit%5D=${limite}&page%5Boffset%5D=${offset}&include=mappings`;
    const caminho = limpo === ""
      // Sem termo, as mais lidas — é a vitrine possível sem o AniList.
      ? `${base}&sort=-userCount`
      : `${base}&filter%5Btext%5D=${encodeURIComponent(limpo)}`;

    const lote = montar(await pedir(caminho));
    obras.push(...lote);

    if (lote.length < limite)
    {
      break;
    }
  }

  return obras;
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
