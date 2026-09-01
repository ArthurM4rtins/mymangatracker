/**
 * Regra do cache de `Media`: dentro do TTL o dado do banco vale e o AniList não
 * é chamado. Módulo de domínio: puro, o relógio vem de fora.
 */

export const TTL_DO_CACHE_MS = 24 * 60 * 60 * 1000;

export function cacheEstaFresco(syncedAt: Date, agora: Date): boolean
{
  // Relógio torto (syncedAt no futuro) conta como fresco: renovar não traria
  // dado mais novo, e a alternativa seria chamar a API a cada requisição.
  return agora.getTime() - syncedAt.getTime() < TTL_DO_CACHE_MS;
}
