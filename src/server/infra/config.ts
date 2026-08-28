/**
 * Leitura das variaveis de ambiente. Ponto unico — nenhuma outra camada le
 * `process.env`, para que "o que o sistema precisa para rodar" fique legivel num
 * arquivo so.
 */

/** A API do AniList e publica e sem chave, entao o default e util de verdade. */
const ANILIST_PADRAO = "https://graphql.anilist.co";

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
