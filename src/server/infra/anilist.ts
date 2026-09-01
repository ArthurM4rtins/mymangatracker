/**
 * Unico ponto do sistema que fala com graphql.anilist.co.
 *
 * A chamada nunca sai do navegador do usuario: o AniList limita requisicoes por
 * minuto, e se cada visitante chamasse direto, a cota do projeto inteiro queimaria
 * no primeiro acesso com movimento. Quem chama e o servidor. Painel 05 do artifact.
 */
import {
  mapearBusca,
  mapearRecomendacoes,
  type MediaDoAniList,
} from "@/server/domain/anilist-media";
import { anilistEndpoint } from "./config";

const TIMEOUT_MS = 5000;
const LIMITE_PADRAO = 20;
const LIMITE_SIMILARES = 6;

// O recorte de campos é um só para toda consulta: o cache em `Media` guarda
// tudo isso, e a página da obra é quem usa os campos além do card.
const CAMPOS_DE_MEDIA = `
      id
      title { romaji english native }
      format
      countryOfOrigin
      chapters
      description(asHtml: false)
      coverImage { large }
      bannerImage
      startDate { year }
      genres
      averageScore
      staff(perPage: 6, sort: RELEVANCE) {
        edges { role node { id name { full } } }
      }`;

const BUSCA = `
query($termo: String, $limite: Int) {
  Page(perPage: $limite) {
    media(search: $termo, type: MANGA, sort: SEARCH_MATCH) {${CAMPOS_DE_MEDIA}
    }
  }
}`;

// Vitrine do catálogo sem termo. `isAdult: false` porque a tela é pública e
// sem sessão — não é o lugar de decidir preferência de conteúdo por usuário.
const POPULARES = `
query($limite: Int) {
  Page(perPage: $limite) {
    media(type: MANGA, sort: POPULARITY_DESC, isAdult: false) {${CAMPOS_DE_MEDIA}
    }
  }
}`;

// Similares = recommendations da própria obra, votadas pela comunidade do
// AniList. Só a página da obra consulta; não entra no cache do banco.
const SIMILARES = `
query($id: Int, $limite: Int) {
  Page(perPage: 1) {
    media(id: $id, type: MANGA) {
      recommendations(perPage: $limite, sort: RATING_DESC) {
        nodes {
          mediaRecommendation {${CAMPOS_DE_MEDIA}
          }
        }
      }
    }
  }
}`;

// Um registro por id: a consulta mais barata que ainda prova ida e volta.
// `Page { pageInfo }` sozinho não serve — o AniList responde 400 "No field
// provided" quando não há campo de conteúdo dentro de `Page`.
const PING = `query { Media(id: 1) { id } }`;

// Por id, mas via `Page`: `Media(id:)` direto responde erro de GraphQL quando o
// id não existe, e não dá para distinguir de rate limit. `Page.media` devolve
// lista vazia — id inexistente vira `null`, não exceção.
const POR_ID = `
query($id: Int) {
  Page(perPage: 1) {
    media(id: $id, type: MANGA) {${CAMPOS_DE_MEDIA}
    }
  }
}`;

/**
 * Busca obras por termo. Devolve lista vazia quando o termo é vazio — não gasta
 * requisição da cota para perguntar nada.
 *
 * @throws quando o AniList não responde ou responde fora do 2xx.
 */
export async function buscarMedia(
  termo: string,
  limite: number = LIMITE_PADRAO,
): Promise<MediaDoAniList[]>
{
  if (termo.trim() === "")
  {
    return [];
  }

  const resposta = await chamar(BUSCA, { termo: termo.trim(), limite });

  return mapearBusca(resposta);
}

/**
 * As obras mais populares do AniList. É o que o catálogo mostra antes de
 * qualquer termo ser digitado.
 *
 * @throws quando o AniList não responde ou responde fora do 2xx.
 */
export async function buscarPopulares(
  limite: number = LIMITE_PADRAO,
): Promise<MediaDoAniList[]>
{
  const resposta = await chamar(POPULARES, { limite });

  return mapearBusca(resposta);
}

/**
 * Uma obra pelo id do AniList. `null` quando o id não existe ou o formato não
 * cabe no nosso modelo (o domínio descartou).
 *
 * @throws quando o AniList não responde — indisponibilidade, não ausência.
 */
export async function buscarMediaPorId(
  anilistId: number,
): Promise<MediaDoAniList | null>
{
  const resposta = await chamar(POR_ID, { id: anilistId });

  return mapearBusca(resposta)[0] ?? null;
}

/**
 * Obras similares — as recommendations da comunidade do AniList para a obra.
 *
 * @throws quando o AniList não responde; resposta torta vira lista vazia.
 */
export async function buscarSimilares(
  anilistId: number,
  limite: number = LIMITE_SIMILARES,
): Promise<MediaDoAniList[]>
{
  const resposta = await chamar(SIMILARES, { id: anilistId, limite });

  return mapearRecomendacoes(resposta);
}

/**
 * Sonda de saúde. Uma consulta mínima só para saber se a API responde.
 *
 * @throws quando não responde — quem traduz isso em `down` é o serviço.
 */
export async function pingAniList(): Promise<"ok">
{
  await chamar(PING, {});

  return "ok";
}

async function chamar(
  query: string,
  variables: Record<string, unknown>,
): Promise<unknown>
{
  const resposta = await fetch(anilistEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
    // O timeout do serviço rejeita a promessa, mas sem abortar a requisição ela
    // seguiria pendurada segurando conexão.
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (!resposta.ok)
  {
    throw new Error(`AniList respondeu ${resposta.status}`);
  }

  const corpo: unknown = await resposta.json();

  // GraphQL erra com HTTP 200: rate limit e query inválida vêm no corpo, não no
  // status. Sem esta checagem o ping reportaria `ok` com a cota estourada.
  if (temErros(corpo))
  {
    throw new Error("AniList devolveu erro de GraphQL");
  }

  return corpo;
}

function temErros(corpo: unknown): boolean
{
  if (typeof corpo !== "object" || corpo === null)
  {
    return false;
  }

  const erros = (corpo as { errors?: unknown }).errors;

  return Array.isArray(erros) && erros.length > 0;
}
