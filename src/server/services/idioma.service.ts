/**
 * Caso de uso: guardar o idioma da interface na conta (#116, fase 5).
 *
 * Quem sabe QUAIS idiomas o site tem é o controller, que enxerga o
 * `routing.locales`. O serviço não confia nisso: grava só o que tem forma de
 * código de idioma. Uma coluna com valor estranho faz o layout devolver 404 no
 * login seguinte da pessoa, e ela fica trancada fora da própria conta.
 */
import { ehCodigoDeIdioma } from "@/server/domain/idioma";
import { salvarIdioma as gravarIdioma } from "@/server/repositories/usuario.repository";

export type PedidoDeIdioma = {
  userId: string;
  locale: string;
};

export type ResultadoDoIdioma =
  | { estado: "ok" }
  | { estado: "idioma_invalido" };

export type DependenciasDoIdioma = {
  gravar: (userId: string, locale: string) => Promise<void>;
};

export async function salvarIdioma(
  pedido: PedidoDeIdioma,
  deps: DependenciasDoIdioma,
): Promise<ResultadoDoIdioma>
{
  if (!ehCodigoDeIdioma(pedido.locale))
  {
    return { estado: "idioma_invalido" };
  }

  await deps.gravar(pedido.userId, pedido.locale);

  return { estado: "ok" };
}

/** A composição de produção. */
export function salvarIdiomaDoSistema(pedido: PedidoDeIdioma): Promise<ResultadoDoIdioma>
{
  return salvarIdioma(pedido, { gravar: gravarIdioma });
}
