/**
 * A regra do rating: 0,5 a 5,0, sempre múltiplo de 0,5 — meia estrela é o
 * menor passo, como no Letterboxd. O CHECK na migration repete isso no banco.
 */
export function ratingValido(valor: number): boolean
{
  return (
    Number.isFinite(valor) &&
    valor >= 0.5 &&
    valor <= 5 &&
    Number.isInteger(valor * 2)
  );
}
