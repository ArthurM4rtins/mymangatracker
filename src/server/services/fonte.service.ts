/**
 * Caso de uso: configurar a fonte de leitura de uma obra da estante.
 *
 * O usuário cola a URL do capítulo 1; o domínio deriva os candidatos e cada um
 * volta com o link de exemplo do capítulo 2 — quem escolhe é o usuário, nunca
 * o sistema em silêncio. A confirmação valida o template e troca a fonte ativa
 * preservando o histórico.
 */
import { derivarCandidatos } from "@/server/domain/url-template";
import { urlDaLeitura } from "@/server/domain/progresso";
import { buscarEntradaDoUsuario } from "@/server/repositories/shelf.repository";
import { trocarFonteAtiva } from "@/server/repositories/reading-source.repository";

const CAPITULO_DE_EXEMPLO = 2;

export type CandidatoDeFonte = {
  sourceHost: string;
  urlTemplate: string;
  urlExemplo: string;
};

export type ResultadoDeCandidatos =
  | { estado: "ok"; candidatos: CandidatoDeFonte[] }
  | { estado: "url_invalida" };

/** Puro: deriva candidatos da URL colada. URL torta é estado, não exceção. */
export function candidatosDeFonte(urlDoCapitulo1: string): ResultadoDeCandidatos
{
  try
  {
    const candidatos = derivarCandidatos(urlDoCapitulo1).map(function (candidato)
    {
      return {
        sourceHost: candidato.sourceHost,
        urlTemplate: candidato.urlTemplate,
        urlExemplo: urlDaLeitura(
          candidato.sourceHost,
          candidato.urlTemplate,
          CAPITULO_DE_EXEMPLO,
        ),
      };
    });

    return { estado: "ok", candidatos };
  }
  catch
  {
    return { estado: "url_invalida" };
  }
}

export type PedidoDeFonte = {
  userId: string;
  entradaId: string;
  sourceHost: string;
  urlTemplate: string;
};

export type ResultadoDeFonte =
  | { estado: "ok" }
  | { estado: "nao_encontrada" }
  | { estado: "template_invalido" };

export type DependenciasDeFonte = {
  buscarEntrada: (
    userId: string,
    entradaId: string,
  ) => Promise<{ entradaId: string; mediaId: string; progressChapter: string | null } | null>;
  trocarFonte: (dados: {
    userId: string;
    mediaId: string;
    sourceHost: string;
    urlTemplate: string;
    confirmadaEm: Date;
  }) => Promise<{ id: string }>;
  relogio?: () => Date;
};

export async function confirmarFonte(
  pedido: PedidoDeFonte,
  deps: DependenciasDeFonte,
): Promise<ResultadoDeFonte>
{
  if (!templateValido(pedido.sourceHost, pedido.urlTemplate))
  {
    return { estado: "template_invalido" };
  }

  const entrada = await deps.buscarEntrada(pedido.userId, pedido.entradaId);

  if (entrada === null)
  {
    return { estado: "nao_encontrada" };
  }

  await deps.trocarFonte({
    userId: pedido.userId,
    mediaId: entrada.mediaId,
    sourceHost: pedido.sourceHost,
    urlTemplate: pedido.urlTemplate,
    confirmadaEm: deps.relogio?.() ?? new Date(),
  });

  return { estado: "ok" };
}

function templateValido(sourceHost: string, urlTemplate: string): boolean
{
  try
  {
    // Monta a URL de exemplo: valida marcador, host e capítulo de uma vez.
    urlDaLeitura(sourceHost, urlTemplate, CAPITULO_DE_EXEMPLO);
  }
  catch
  {
    return false;
  }

  return sourceHost !== "" && !sourceHost.includes("/");
}

/** A composição de produção. */
export function confirmarFonteDoSistema(
  pedido: PedidoDeFonte,
): Promise<ResultadoDeFonte>
{
  return confirmarFonte(pedido, {
    buscarEntrada: buscarEntradaDoUsuario,
    trocarFonte: trocarFonteAtiva,
  });
}
