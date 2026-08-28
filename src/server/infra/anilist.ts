/**
 * Unico ponto do sistema que fala com graphql.anilist.co.
 *
 * A chamada nunca sai do navegador do usuario: o AniList limita requisicoes por
 * minuto, e se cada visitante chamasse direto, a cota do projeto inteiro queimaria
 * no primeiro acesso com movimento. Quem chama e o servidor. Painel 05 do artifact.
 */
import { mapearBusca, type MediaDoAniList } from "@/server/domain/anilist-media";
import { anilistEndpoint } from "./config";

const TIMEOUT_MS = 5000;
const LIMITE_PADRAO = 20;

const BUSCA = `
query($termo: String, $limite: Int) {
  Page(perPage: $limite) {
    media(search: $termo, type: MANGA, sort: SEARCH_MATCH) {
      id
      title { romaji english native }
      format
      countryOfOrigin
      chapters
      description(asHtml: false)
      coverImage { large }
    }
  }
}`;

// Um registro por id: a consulta mais barata que ainda prova ida e volta.
// `Page { pageInfo }` sozinho não serve — o AniList responde 400 "No field
// provided" quando não há campo de conteúdo dentro de `Page`.
const PING = `query { Media(id: 1) { id } }`;

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
