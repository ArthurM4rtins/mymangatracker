/**
 * Caso de uso: configurar a fonte de leitura de uma obra da estante.
 *
 * O usuário cola a URL do capítulo 1; o domínio deriva os candidatos e cada um
 * volta com o link de exemplo do capítulo 2 — quem escolhe é o usuário, nunca
 * o sistema em silêncio. A confirmação valida o template e troca a fonte ativa
 * preservando o histórico.
 */
import { derivarCandidatos } from "@/server/domain/url-template";
import {
  tipoDaFonte,
  urlDaLeitura,
  urlDaPagina,
} from "@/server/domain/progresso";
import { buscarEntradaDoUsuario } from "@/server/repositories/shelf.repository";
import { trocarFonteAtiva } from "@/server/repositories/reading-source.repository";

const CAPITULO_DE_EXEMPLO = 2;

export type CandidatoDeFonte = {
  sourceHost: string;
  urlTemplate: string;
  urlExemplo: string;
};

export type ResultadoDeCandidatos =
  | { estado: "ok"; candidatos: CandidatoDeFonte[]; paginaDaObra: CandidatoDeFonte }
  | { estado: "url_invalida" };

/**
 * Puro: deriva candidatos da URL colada. URL torta é estado, não exceção.
 *
 * `paginaDaObra` sempre vem junto: em site que não carrega o número do
 * capítulo na URL (MangaFire, MangaDex), é o fallback que o usuário confirma.
 */
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

    const url = new URL(urlDoCapitulo1);
    // A query entra: há site que identifica a obra nela (#65, item 2). O hash
    // não — é posição dentro da página, não identidade.
    const caminho = url.pathname + url.search;

    return {
      estado: "ok",
      candidatos,
      paginaDaObra: {
        sourceHost: url.host,
        urlTemplate: caminho,
        urlExemplo: urlDaPagina(url.host, caminho),
      },
    };
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
  if (sourceHost === "" || sourceHost.includes("/") || !urlTemplate.startsWith("/"))
  {
    return false;
  }

  try
  {
    // Monta a URL correspondente ao tipo: valida marcador e capítulo de uma vez.
    if (tipoDaFonte(urlTemplate) === "template")
    {
      urlDaLeitura(sourceHost, urlTemplate, CAPITULO_DE_EXEMPLO);
    }
    else
    {
      urlDaPagina(sourceHost, urlTemplate);
    }
  }
  catch
  {
    return false;
  }

  return true;
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
