/**
 * O IP de quem chamou, para o limite de tentativas (#108).
 *
 * Na Vercel o cliente chega por proxy: o IP real vem em `x-forwarded-for`
 * (o primeiro da lista). Sem o header (dev local) todo mundo cai em
 * "desconhecido" — o teto por IP é folgado por causa disso.
 */
export function ipDoPedido(request: Request): string
{
  const encadeado = request.headers.get("x-forwarded-for");

  if (encadeado)
  {
    const primeiro = encadeado.split(",")[0]?.trim();

    if (primeiro)
    {
      return primeiro;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || "desconhecido";
}
