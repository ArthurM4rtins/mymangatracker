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
  janelaDeFalhaMs = 0,
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
      if (lembrada !== atual)
      {
        return;
      }

      // A falha vale por uma janela PRÓPRIA e curta (#148, item 11). Limpar na
      // hora desligava o memo justo durante a indisponibilidade do terceiro:
      // cada chamada virava uma requisição nova, mantendo a cota fixada em zero
      // exatamente quando ela precisava se recuperar. Zero mantém o
      // comportamento antigo, para quem não quiser lembrar falha.
      lembrada = janelaDeFalhaMs > 0
        ? { promessa, validaAte: instante + janelaDeFalhaMs }
        : null;
    });

    return promessa;
  };
}

/**
 * O mesmo, mas por chave (#134). Similares e autor são leituras ao vivo do
 * AniList e o id vem da URL, então um valor lembrado só não serve.
 *
 * `maximoDeChaves` não é detalhe: chave escolhida por quem visita é chave sem
 * limite, e um mapa que só cresce seria vazamento de memória com a porta aberta.
 * Ao encher, sai a chave mais antiga do mapa — a inserção mantém a ordem.
 *
 * Como em `lembrarPorTempo`: a promessa em voo é compartilhada, e falha não
 * fica lembrada nem ocupa vaga.
 */
export function lembrarPorChave<K, T>(
  fn: (chave: K) => Promise<T>,
  janelaMs: number,
  maximoDeChaves: number,
  agora: () => number = Date.now,
): (chave: K) => Promise<T>
{
  const lembradas = new Map<K, { promessa: Promise<T>; validaAte: number }>();

  return function (chave: K)
  {
    const instante = agora();
    const lembrada = lembradas.get(chave);

    if (lembrada !== undefined && instante < lembrada.validaAte)
    {
      return lembrada.promessa;
    }

    const promessa = fn(chave);
    const atual = { promessa, validaAte: instante + janelaMs };

    lembradas.delete(chave);
    lembradas.set(chave, atual);

    while (lembradas.size > maximoDeChaves)
    {
      const maisAntiga = lembradas.keys().next();

      if (maisAntiga.done === true)
      {
        break;
      }

      lembradas.delete(maisAntiga.value);
    }

    promessa.catch(function ()
    {
      if (lembradas.get(chave) === atual)
      {
        lembradas.delete(chave);
      }
    });

    return promessa;
  };
}
