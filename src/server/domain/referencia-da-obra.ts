/**
 * Como uma obra é identificada de fora do sistema (#254).
 *
 * Era `anilistId` e só. O que o AniList não conhecia sumia: buscando "The
 * Beginning After The End" em 10/09/2026, o Kitsu devolve três registros e
 * NENHUM tem mapeamento para o AniList, então a obra não existia no Folunio.
 * Medido no mesmo dia, isso apagava 75% do resultado de "omniscient reader" e
 * 40% do de "tower of god" — justamente o manhwa coreano, que é metade do
 * público daqui.
 *
 * Agora a identidade é o par (fonte, id). Quem tem AniList continua sendo
 * chamada por ele; o Kitsu é o segundo nome da mesma linha. Quem só existe no
 * Kitsu é chamada pelo Kitsu.
 *
 * O id INTERNO continua fora das URLs de propósito: usá-lo obrigaria a gravar a
 * obra antes de poder linkar para ela, e o combinado com o uso justo do Kitsu é
 * não espelhar catálogo — a obra entra no banco quando alguém a abre, não
 * quando ela aparece numa lista de busca.
 */

export type FonteDaObra = "anilist" | "kitsu";

export type ReferenciaDaObra = {
  fonte: FonteDaObra;
  id: number;
};

const FONTES: FonteDaObra[] = ["anilist", "kitsu"];

function ehFonte(valor: string): valor is FonteDaObra
{
  return FONTES.some(function (conhecida) { return conhecida === valor; });
}

/** Inteiro positivo e nada mais: o que vem da URL nunca é de confiança. */
function idValido(valor: string): number | null
{
  if (!/^\d+$/.test(valor))
  {
    return null;
  }

  const numero = Number(valor);

  return numero > 0 ? numero : null;
}

/**
 * Lê a referência dos segmentos da URL.
 *
 * Com um segmento só, é a URL antiga (`/obra/30002`) e vale como AniList —
 * senão todo link e favorito já existente quebraria no dia da mudança.
 */
export function interpretarReferencia(
  fonte: string,
  id?: string,
): ReferenciaDaObra | null
{
  if (id === undefined)
  {
    const antigo = idValido(fonte);

    return antigo === null ? null : { fonte: "anilist", id: antigo };
  }

  if (!ehFonte(fonte))
  {
    return null;
  }

  const numero = idValido(id);

  return numero === null ? null : { fonte, id: numero };
}

export function caminhoDaObra(referencia: ReferenciaDaObra): string
{
  return `/obra/${referencia.fonte}/${referencia.id}`;
}

/**
 * A obra como um texto só: `anilist:30002`, `kitsu:54598`.
 *
 * É esta chave que substitui o `anilistId: number` em DTO, chave de lista do
 * React, corpo de API e conjunto de "já na estante". Um campo e um tipo em cada
 * ponta, em vez de um objeto aninhado — e greppável, o que importa numa troca
 * que atravessa o sistema inteiro.
 */
export function chaveDaObra(referencia: ReferenciaDaObra): string
{
  return `${referencia.fonte}:${referencia.id}`;
}

/** Nada aqui é de confiança: a chave chega pelo corpo de uma requisição. */
export function referenciaDaChave(chave: string): ReferenciaDaObra | null
{
  const partes = chave.split(":");

  return partes.length === 2
    ? interpretarReferencia(partes[0], partes[1])
    : null;
}

/**
 * A referência de uma linha do banco. Com os dois ids, o AniList manda: é o
 * nome canônico da obra, e mantê-lo estável preserva os links que já existem.
 */
export function referenciaDeMedia(media: {
  anilistId: number | null;
  kitsuId: number | null;
}): ReferenciaDaObra | null
{
  if (media.anilistId !== null)
  {
    return { fonte: "anilist", id: media.anilistId };
  }

  if (media.kitsuId !== null)
  {
    return { fonte: "kitsu", id: media.kitsuId };
  }

  return null;
}
