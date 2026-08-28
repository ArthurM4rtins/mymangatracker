/**
 * Agrega o estado das dependencias num relatorio de saude.
 *
 * As sondas entram injetadas: o servico nao sabe o que e Postgres nem o que e
 * AniList, so sabe que uma sonda responde `ok`, responde `not_configured`, ou
 * levanta erro. E o que deixa o teste rodar sem banco e sem rede.
 */
import {
  estadoGeral,
  type Dependencia,
  type EstadoGeral,
} from "@/server/domain/health-status";

/** Responde o estado, ou levanta erro — levantar erro significa `down`. */
export type Sonda = () => Promise<"ok" | "not_configured">;

export type DependenciasDoHealth = {
  database: Sonda;
  anilist: Sonda;
  relogio?: () => Date;
  timeoutMs?: number;
};

export type RelatorioSaude = {
  status: EstadoGeral;
  checkedAt: string;
  dependencies: Dependencia[];
};

/** Sonda que passar disso é tratada como fora — health que pendura é pior que inútil. */
const TIMEOUT_PADRAO_MS = 3000;

export async function verificarSaude(
  deps: DependenciasDoHealth,
): Promise<RelatorioSaude>
{
  const relogio = deps.relogio ?? function () { return new Date(); };
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_PADRAO_MS;

  // Em paralelo: uma sonda lenta não pode somar o tempo da outra.
  const dependencies = await Promise.all([
    medir("database", deps.database, timeoutMs),
    medir("anilist", deps.anilist, timeoutMs),
  ]);

  return {
    status: estadoGeral(dependencies),
    checkedAt: relogio().toISOString(),
    dependencies,
  };
}

async function medir(
  name: string,
  sonda: Sonda,
  timeoutMs: number,
): Promise<Dependencia>
{
  const inicio = Date.now();

  try
  {
    const status = await comTimeout(sonda(), timeoutMs);

    // `not_configured` não mediu nada: não houve chamada que pudesse demorar.
    return status === "not_configured"
      ? { name, status }
      : { name, status, latencyMs: Date.now() - inicio };
  }
  catch
  {
    // O erro morre aqui, de propósito. Mensagem de driver Postgres carrega host,
    // usuário e às vezes a senha — nada disso pode chegar ao corpo da resposta,
    // que é público. Quem precisa do detalhe olha o log da plataforma.
    return { name, status: "down", latencyMs: Date.now() - inicio };
  }
}

function comTimeout<T>(promessa: Promise<T>, ms: number): Promise<T>
{
  return new Promise<T>(function (resolve, reject)
  {
    const relogio = setTimeout(function ()
    {
      reject(new Error(`sonda passou de ${ms}ms`));
    }, ms);

    promessa.then(
      function (valor)
      {
        clearTimeout(relogio);
        resolve(valor);
      },
      function (erro)
      {
        clearTimeout(relogio);
        reject(erro);
      },
    );
  });
}
