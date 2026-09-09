/**
 * Caso de uso: relatar erro de tradução (issue #158).
 *
 * Só quem está logado envia (decisão de 09/09/2026): reaproveita o limitador que
 * já existe, o autor fica rastreável, e o volume é controlável — cada envio vira
 * uma issue pública no repositório, então anônimo convidaria spam.
 */
import { montarRelato } from "@/server/domain/relato-de-traducao";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import { abrirIssueDeRelato, type ResultadoDaPublicacao } from "@/server/infra/github";
import { limitarRelato } from "./limite.service";

export type PedidoDeEnvio = {
  userId: string;
  username: string;
  texto: string;
  sugestao: string;
  rota: string;
  idioma: string;
};

export type ResultadoDoEnvio =
  | { estado: "ok"; url: string }
  | { estado: "relato_invalido" }
  | { estado: "muitos_pedidos"; esperarSegundos: number }
  | { estado: "indisponivel" };

export type DependenciasDoRelato = {
  limitar: (userId: string) => Promise<Veredito>;
  publicar: (titulo: string, corpo: string) => Promise<ResultadoDaPublicacao>;
};

export async function enviarRelato(
  pedido: PedidoDeEnvio,
  deps: DependenciasDoRelato,
): Promise<ResultadoDoEnvio>
{
  // O domínio decide o que é relato. Vazio não gasta o balde de ninguém.
  const relato = montarRelato({
    texto: pedido.texto,
    sugestao: pedido.sugestao,
    rota: pedido.rota,
    idioma: pedido.idioma,
    username: pedido.username,
  });

  if (relato === null)
  {
    return { estado: "relato_invalido" };
  }

  const limite = await deps.limitar(pedido.userId);

  if (limite.bloqueado)
  {
    return { estado: "muitos_pedidos", esperarSegundos: limite.esperarSegundos };
  }

  const publicado = await deps.publicar(relato.titulo, relato.corpo);

  // Canal fora e falha do GitHub dão a mesma resposta na tela: o relato NÃO foi
  // registrado. Distinguir os dois só ajudaria quem está sondando a instalação,
  // e para quem escreveu o resultado é o mesmo — vale tentar de novo depois.
  return publicado.estado === "ok"
    ? { estado: "ok", url: publicado.url }
    : { estado: "indisponivel" };
}

/** A composição de produção. */
export function enviarRelatoDoSistema(pedido: PedidoDeEnvio): Promise<ResultadoDoEnvio>
{
  return enviarRelato(pedido, {
    limitar: function (userId) { return limitarRelato({ userId }); },
    publicar: abrirIssueDeRelato,
  });
}
