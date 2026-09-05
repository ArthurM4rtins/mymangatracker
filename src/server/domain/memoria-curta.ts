/**
 * Lembra o resultado de uma função assíncrona por uma janela de tempo.
 *
 * Feita para a sonda do health (#65, item 26): a rota é pública e cada chamada
 * ia ao AniList de verdade, gastando a cota compartilhada de todo o app. A
 * promessa em voo é compartilhada (chamadas concorrentes não duplicam); falha
 * não fica lembrada — a próxima chamada tenta de novo.
 */
export function lembrarPorTempo<T>(
  fn: () => Promise<T>,
  janelaMs: number,
  agora: () => number = Date.now,
): () => Promise<T>
{
  let lembrada: { promessa: Promise<T>; validaAte: number } | null = null;

  return function ()
  {
    const instante = agora();

    if (lembrada !== null && instante < lembrada.validaAte)
    {
      return lembrada.promessa;
    }

    const promessa = fn();
    const atual = { promessa, validaAte: instante + janelaMs };
    lembrada = atual;

    promessa.catch(function ()
    {
      if (lembrada === atual)
      {
        lembrada = null;
      }
    });

    return promessa;
  };
}
