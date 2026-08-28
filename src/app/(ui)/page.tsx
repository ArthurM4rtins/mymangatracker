import Link from "next/link";
import { verificarSaudeDoSistema } from "@/server/services/sistema.service";
import type { Dependencia, EstadoGeral } from "@/server/domain/health-status";

// Mede o agora: nunca pré-renderizada, nunca servida de cache.
export const dynamic = "force-dynamic";

const RESUMO: Record<EstadoGeral, string> = {
  ok: "Tudo no ar.",
  degraded: "No ar, com configuração pendente.",
  down: "Alguma dependência está fora.",
};

const ROTULO_DEPENDENCIA: Record<string, string> = {
  database: "Banco de dados",
  anilist: "Catálogo AniList",
};

const ESTADO_DEPENDENCIA: Record<Dependencia["status"], string> = {
  ok: "respondendo",
  down: "fora do ar",
  not_configured: "não configurado",
};

const COR: Record<Dependencia["status"], string> = {
  ok: "bg-emerald-500",
  down: "bg-red-500",
  not_configured: "bg-amber-500",
};

export default async function Home()
{
  const saude = await verificarSaudeDoSistema();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">MyMangaTracker</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Um Letterboxd para mangá, manhwa e novel, com progresso de leitura
          automático e privado.
        </p>
      </header>

      <section
        aria-labelledby="titulo-status"
        className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800"
      >
        <div className="flex flex-col gap-1">
          <h2 id="titulo-status" className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Status do sistema
          </h2>
          <p className="text-lg">{RESUMO[saude.status]}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {saude.dependencies.map(function (dependencia)
          {
            return (
              <li key={dependencia.name} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden
                  className={`size-2 shrink-0 rounded-full ${COR[dependencia.status]}`}
                />
                <span className="flex-1">
                  {ROTULO_DEPENDENCIA[dependencia.name] ?? dependencia.name}
                </span>
                <span className="text-neutral-600 dark:text-neutral-400">
                  {ESTADO_DEPENDENCIA[dependencia.status]}
                  {dependencia.latencyMs !== undefined && ` · ${dependencia.latencyMs} ms`}
                </span>
              </li>
            );
          })}
        </ul>

        {saude.status === "degraded" && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            As telas que dependem do banco ficam indisponíveis até a configuração
            ser concluída. O catálogo continua funcionando.
          </p>
        )}

        <p className="text-xs text-neutral-500">
          Verificado em {saude.checkedAt} ·{" "}
          <Link href="/api/v1/health" className="underline underline-offset-4">
            /api/v1/health
          </Link>
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Começar
        </h2>
        <Link
          href="/catalogo"
          className="w-fit rounded-md border border-neutral-900 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white dark:border-neutral-100 dark:hover:bg-neutral-100 dark:hover:text-neutral-900"
        >
          Buscar no catálogo
        </Link>
      </section>
    </main>
  );
}
