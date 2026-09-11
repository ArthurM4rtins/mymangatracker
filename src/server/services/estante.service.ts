import { buscarObraNaFonte, type ResultadoDaFonte } from "./obra-externa.service";
import type { ReferenciaDaObra } from "@/server/domain/referencia-da-obra";
/**
 * Caso de uso: adicionar uma obra à estante.
 *
 * O que vem da tela é só o `anilistId` — os dados da obra saem do cache em
 * `Media` (TTL de 24h) ou do AniList via infra. Nunca do corpo da requisição:
 * cache alimentado pelo cliente seria dado forjável.
 */
import { cacheEstaFresco } from "@/server/domain/media-cache";
import { capituloValido } from "@/server/domain/progresso";
import type { Veredito } from "@/server/domain/limite-de-tentativas";
import { limitarEntrada } from "./limite.service";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import {
  buscarMediaPorReferencia,
  salvarMediaDoAniList,
} from "@/server/repositories/media.repository";
import {
  adicionarOuAtualizarEntrada,
  atualizarProgressoDaEntrada,
  atualizarStatusDaEntrada,
  listarChavesDaEstante,
  listarEntradasDoUsuario,
} from "@/server/repositories/shelf.repository";
import {
  contarAberturasPorObra,
  listarAberturasMaisAvancadas,
} from "@/server/repositories/reading-progress.repository";
import { listarAvaliacoes } from "@/server/repositories/avaliacao.repository";

export type StatusDaEstante =
  | "READING"
  | "COMPLETED"
  | "PLANNED"
  | "PAUSED"
  | "DROPPED";

export type PedidoDeEstante = {
  userId: string;
  /** A obra pela referência (#254): pode não ter AniList nenhum. */
  referencia: ReferenciaDaObra;
  status: StatusDaEstante;
};

export type ResultadoDaEstante =
  | { estado: "ok"; entradaId: string }
  | { estado: "obra_desconhecida" }
  | { estado: "indisponivel" }
  | { estado: "limitado"; esperarSegundos: number };

export type DependenciasDaEstante = {
  buscarMediaNoBanco: (
    referencia: ReferenciaDaObra,
  ) => Promise<{ id: string; syncedAt: Date } | null>;
  salvarMedia: (
    obra: MediaDoAniList,
    sincronizadoEm: Date,
  ) => Promise<{ id: string; syncedAt: Date }>;
  /** A escada de fontes, uma só para o sistema inteiro (#254). */
  buscarNaFonte: (referencia: ReferenciaDaObra) => Promise<ResultadoDaFonte>;
  gravarEntrada: (dados: {
    userId: string;
    mediaId: string;
    status: StatusDaEstante;
  }) => Promise<{ id: string }>;
  /** Teto de entradas por usuário na janela (#136). Antes do AniList: é I/O de terceiro. */
  limitar: (userId: string) => Promise<Veredito>;
  relogio?: () => Date;
};

export async function adicionarNaEstante(
  pedido: PedidoDeEstante,
  deps: DependenciasDaEstante,
): Promise<ResultadoDaEstante>
{
  const agora = deps.relogio?.() ?? new Date();

  const limite = await deps.limitar(pedido.userId);

  if (limite.bloqueado)
  {
    return { estado: "limitado", esperarSegundos: limite.esperarSegundos };
  }

  const emCache = await deps.buscarMediaNoBanco(pedido.referencia);

  let mediaId: string;

  if (emCache && cacheEstaFresco(emCache.syncedAt, agora))
  {
    mediaId = emCache.id;
  }
  else
  {
    const daFonte = await deps.buscarNaFonte(pedido.referencia);

    if (daFonte.estado === "indisponivel")
    {
      // Mesmo com cache velho não gravamos entrada: a obra pode ter mudado de
      // formato e sido descartada — melhor pedir para tentar depois.
      return { estado: "indisponivel" };
    }

    const obra = daFonte.obra;

    if (obra === null)
    {
      // O domínio descartou (formato fora do enum, sem título). Não vira linha.
      return { estado: "obra_desconhecida" };
    }

    const salvo = await deps.salvarMedia(obra, agora);
    mediaId = salvo.id;
  }

  const entrada = await deps.gravarEntrada({
    userId: pedido.userId,
    mediaId,
    status: pedido.status,
  });

  return { estado: "ok", entradaId: entrada.id };
}

/** O que a tela da estante recebe por entrada. Contrato, não entidade do Prisma. */
export type EntradaDaEstante = {
  entradaId: string;
  status: StatusDaEstante;
  progressChapter: string | null;
  obra: {
    chave: string;
    titleRomaji: string;
    titleEnglish: string | null;
    /** Para a extensão casar o nome em site de outra língua (#171). */
    titleNative: string | null;
    coverImageUrl: string | null;
    type: "MANGA" | "NOVEL";
    countryOfOrigin: string | null;
    chapters: number | null;
  };
  /**
   * Para onde o "Continuar leitura" leva: a abertura mais avançada que a
   * extensão registrou. `null` quando ainda não houve nenhuma — a tela não
   * tem para onde continuar, e diz isso em vez de inventar destino (#170).
   */
  continuarEm: { url: string; host: string; capitulo: string } | null;
  /** Total de aberturas: e o numero que a confirmacao do reset mostra (#172). */
  totalDeAberturas: number;
  /** A avaliação do dono — nota e/ou resenha, estilo Letterboxd. */
  avaliacao: {
    rating: string | null;
    review: string | null;
    containsSpoilers: boolean;
  } | null;
};

export type FiltroDaEstante = {
  userId: string;
  status?: StatusDaEstante;
};

type EntradaNoRepositorio = Omit<
  EntradaDaEstante,
  "continuarEm" | "avaliacao" | "totalDeAberturas"
> & {
  mediaId: string;
};

export type DependenciasDeListagem = {
  listarEntradas: (
    userId: string,
    status?: StatusDaEstante,
  ) => Promise<EntradaNoRepositorio[]>;
  listarLeiturasMaisAvancadas: (
    userId: string,
  ) => Promise<Array<{ mediaId: string; resolvedUrl: string; chapter: string }>>;
  contarAberturasPorObra: (
    userId: string,
  ) => Promise<Array<{ mediaId: string; total: number }>>;
  listarAvaliacoes: (
    userId: string,
  ) => Promise<
    Array<{
      mediaId: string;
      rating: string | null;
      review: string | null;
      containsSpoilers: boolean;
    }>
  >;
};

/**
 * A estante é privada do dono: o userId vem da sessão resolvida no controller
 * e é obrigatório aqui por tipo — não existe caminho de listar sem ele.
 *
 * O DTO compõe a última abertura; o mediaId interno não sai.
 */
export async function listarEstante(
  filtro: FiltroDaEstante,
  deps: DependenciasDeListagem,
): Promise<EntradaDaEstante[]>
{
  const [entradas, leituras, avaliacoes, totais] = await Promise.all([
    deps.listarEntradas(filtro.userId, filtro.status),
    deps.listarLeiturasMaisAvancadas(filtro.userId),
    deps.listarAvaliacoes(filtro.userId),
    deps.contarAberturasPorObra(filtro.userId),
  ]);
  const totalPorMedia = new Map(
    totais.map(function (t) { return [t.mediaId, t.total] as const; }),
  );

  const leituraPorMedia = new Map(
    leituras.map(function (leitura) { return [leitura.mediaId, leitura] as const; }),
  );
  const avaliacaoPorMedia = new Map(
    avaliacoes.map(function (avaliacao) { return [avaliacao.mediaId, avaliacao] as const; }),
  );

  return entradas.map(function (entrada)
  {
    const leitura = leituraPorMedia.get(entrada.mediaId) ?? null;
    const avaliacao = avaliacaoPorMedia.get(entrada.mediaId) ?? null;

    return {
      entradaId: entrada.entradaId,
      status: entrada.status,
      progressChapter: entrada.progressChapter,
      obra: entrada.obra,
      continuarEm: leitura === null ? null : recorteDaLeitura(leitura),
      totalDeAberturas: totalPorMedia.get(entrada.mediaId) ?? 0,
      avaliacao:
        avaliacao === null
          ? null
          : {
              rating: avaliacao.rating,
              review: avaliacao.review,
              containsSpoilers: avaliacao.containsSpoilers,
            },
    };
  });
}

// O host sai da propria URL gravada, nao de coluna a parte: uma verdade so.
// A URL passou por `normalizarUrlVisitada` antes de entrar no banco, entao
// `new URL` aqui nao levanta.
function recorteDaLeitura(leitura: {
  resolvedUrl: string;
  chapter: string;
}): NonNullable<EntradaDaEstante["continuarEm"]>
{
  return {
    url: leitura.resolvedUrl,
    host: new URL(leitura.resolvedUrl).host,
    capitulo: leitura.chapter,
  };
}

export type PedidoDeProgresso = {
  userId: string;
  entradaId: string;
  capitulo: number;
};

export type ResultadoDeProgresso =
  | { estado: "ok" }
  | { estado: "nao_encontrada" }
  | { estado: "capitulo_invalido" };

export type DependenciasDeProgresso = {
  atualizarProgresso: (
    userId: string,
    entradaId: string,
    capitulo: number,
  ) => Promise<{ id: string } | null>;
};

/**
 * Edição manual do capítulo em leitura. Correção do dono: seta direto,
 * inclusive para trás — a regra do maior capítulo vale para aberturas, não
 * para edição. Entrada alheia responde igual à inexistente.
 */
export async function definirProgresso(
  pedido: PedidoDeProgresso,
  deps: DependenciasDeProgresso,
): Promise<ResultadoDeProgresso>
{
  if (!capituloValido(pedido.capitulo))
  {
    return { estado: "capitulo_invalido" };
  }

  const atualizada = await deps.atualizarProgresso(
    pedido.userId,
    pedido.entradaId,
    pedido.capitulo,
  );

  return atualizada === null ? { estado: "nao_encontrada" } : { estado: "ok" };
}

/** A composição de produção. */
export function definirProgressoDoSistema(
  pedido: PedidoDeProgresso,
): Promise<ResultadoDeProgresso>
{
  return definirProgresso(pedido, {
    atualizarProgresso: atualizarProgressoDaEntrada,
  });
}

export type DependenciasDeMarcacao = {
  listarChaves: (userId: string) => Promise<string[]>;
};

/**
 * O que da estante já existe, por CHAVE da obra — para o catálogo marcar os
 * cards. Era por `anilistId` (#254): obra que só o Kitsu conhece nunca ficava
 * marcada, porque não tinha número nenhum para comparar.
 */
export function chavesNaEstante(
  userId: string,
  deps: DependenciasDeMarcacao,
): Promise<string[]>
{
  return deps.listarChaves(userId);
}

/** A composição de produção. */
export function chavesNaEstanteDoSistema(userId: string): Promise<string[]>
{
  return chavesNaEstante(userId, { listarChaves: listarChavesDaEstante });
}

export type PedidoDeStatus = {
  userId: string;
  entradaId: string;
  status: StatusDaEstante;
};

export type ResultadoDeStatus = { estado: "ok" } | { estado: "nao_encontrada" };

export type DependenciasDeStatus = {
  atualizarStatus: (
    userId: string,
    entradaId: string,
    status: StatusDaEstante,
  ) => Promise<{ id: string } | null>;
};

/**
 * Entrada de outro usuário e entrada inexistente respondem igual
 * (`nao_encontrada`): não revelamos que a entrada alheia existe.
 */
export async function mudarStatusDaEntrada(
  pedido: PedidoDeStatus,
  deps: DependenciasDeStatus,
): Promise<ResultadoDeStatus>
{
  const atualizada = await deps.atualizarStatus(
    pedido.userId,
    pedido.entradaId,
    pedido.status,
  );

  return atualizada === null ? { estado: "nao_encontrada" } : { estado: "ok" };
}

/** A composição de produção. */
export function listarEstanteDoSistema(
  filtro: FiltroDaEstante,
): Promise<EntradaDaEstante[]>
{
  return listarEstante(filtro, {
    listarEntradas: listarEntradasDoUsuario,
    listarLeiturasMaisAvancadas: listarAberturasMaisAvancadas,
    contarAberturasPorObra,
    listarAvaliacoes,
  });
}

/** A composição de produção. */
export function mudarStatusDaEntradaDoSistema(
  pedido: PedidoDeStatus,
): Promise<ResultadoDeStatus>
{
  return mudarStatusDaEntrada(pedido, {
    atualizarStatus: atualizarStatusDaEntrada,
  });
}

/** A composição de produção. */
export function adicionarNaEstanteDoSistema(
  pedido: PedidoDeEstante,
): Promise<ResultadoDaEstante>
{
  return adicionarNaEstante(pedido, {
    buscarMediaNoBanco: buscarMediaPorReferencia,
    salvarMedia: salvarMediaDoAniList,
    buscarNaFonte: function (referencia) { return buscarObraNaFonte(referencia); },
    gravarEntrada: adicionarOuAtualizarEntrada,
    limitar: function (userId) { return limitarEntrada({ userId }); },
  });
}
