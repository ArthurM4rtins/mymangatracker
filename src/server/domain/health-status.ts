/**
 * Estado de saude do sistema, derivado do estado de cada dependencia.
 *
 * A distincao que importa: **configuracao pendente nao e falha**. Um banco que
 * ainda nao foi ligado deixa o sistema `degraded` e respondendo 200, porque o app
 * continua servindo tudo que nao depende dele. Um banco que existe e recusa
 * conexao e `down`, e ai o 503 e honesto.
 *
 * Modulo de dominio: puro, sem import do projeto e sem I/O.
 */

/** `not_configured`: a dependencia nem foi ligada — nao houve tentativa que pudesse falhar. */
export type EstadoDependencia = "ok" | "down" | "not_configured";

export type EstadoGeral = "ok" | "degraded" | "down";

export type Dependencia = {
  name: string;
  status: EstadoDependencia;
  /** Ausente quando nao houve chamada — `not_configured` nao mede tempo de nada. */
  latencyMs?: number;
};

const HTTP_POR_ESTADO: Record<EstadoGeral, number> = {
  ok: 200,
  degraded: 200,
  down: 503,
};

/**
 * Reduz os estados individuais no estado geral.
 *
 * `down` vence `not_configured`: falha real nunca é rebaixada a aviso de
 * configuração.
 *
 * @throws quando a lista está vazia — não haver o que checar não é o mesmo que
 *   estar tudo bem, e devolver `ok` aí esconderia um bug de montagem dos checks.
 */
export function estadoGeral(dependencias: Dependencia[]): EstadoGeral
{
  if (dependencias.length === 0)
  {
    throw new Error("nenhuma dependência checada — não há o que reportar");
  }

  if (dependencias.some(estaFora))
  {
    return "down";
  }

  if (dependencias.some(naoConfigurada))
  {
    return "degraded";
  }

  return "ok";
}

/** Status HTTP do endpoint de health para um estado geral. */
export function httpStatusPara(estado: EstadoGeral): number
{
  return HTTP_POR_ESTADO[estado];
}

function estaFora(dependencia: Dependencia): boolean
{
  return dependencia.status === "down";
}

function naoConfigurada(dependencia: Dependencia): boolean
{
  return dependencia.status === "not_configured";
}
