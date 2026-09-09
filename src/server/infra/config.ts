/**
 * Leitura das variaveis de ambiente. Ponto unico — nenhuma outra camada le
 * `process.env`, para que "o que o sistema precisa para rodar" fique legivel num
 * arquivo so.
 */

/** A API do AniList e publica e sem chave, entao o default e util de verdade. */
const ANILIST_PADRAO = "https://graphql.anilist.co";

/**
 * Quantos proxies confiaveis anexam ao `x-forwarded-for` antes de o pedido
 * chegar ao app (#141). Um na Vercel. Fora de um inteiro positivo, vale 1.
 */
export function hopsConfiaveis(): number
{
  const bruto = Number(process.env.IP_HOPS_CONFIAVEIS ?? "1");

  return Number.isInteger(bruto) && bruto >= 1 ? bruto : 1;
}

export function anilistEndpoint(): string
{
  return process.env.ANILIST_ENDPOINT?.trim() || ANILIST_PADRAO;
}

/**
 * Se ha banco configurado. Não diz nada sobre ele responder — isso é a sonda que
 * descobre. Serve para separar "ainda não ligaram" de "ligaram e está fora".
 */
export function bancoConfigurado(): boolean
{
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Se o segredo da sessão existe. Sem ele nenhum login funciona, e antes nada
 * no deploy olhava para isso — o health passa a reportar (#65, item 23).
 */
/**
 * Segredo do HMAC das chaves de tentativa (#148, item 5). Opcional: ausente, as
 * chaves continuam estáveis e o app funciona — só não resistem a um dump, que é
 * o modo de desenvolvimento. Em produção, definir.
 */
export function pepperDoLimite(): string
{
  return process.env.LIMITE_PEPPER ?? "";
}

export function sessaoConfigurada(): boolean
{
  return Boolean(process.env.SESSION_SECRET);
}
