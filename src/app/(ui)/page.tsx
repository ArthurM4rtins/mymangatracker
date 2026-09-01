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
        <h1 className="text-3xl font-semibold tracking-tight">Kidoku</h1>
        <p className="text-texto-suave">
          Um Letterboxd para mangá, manhwa e novel, com progresso de leitura
          automático e privado.
        </p>
      </header>

      <section
        aria-labelledby="titulo-status"
        className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6"
      >
        <div className="flex flex-col gap-1">
          <h2 id="titulo-status" className="text-sm font-medium uppercase tracking-wide text-texto-suave">
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
                <span className="text-texto-suave">
                  {ESTADO_DEPENDENCIA[dependencia.status]}
                  {dependencia.latencyMs !== undefined && ` · ${dependencia.latencyMs} ms`}
                </span>
              </li>
            );
          })}
        </ul>

        {saude.status === "degraded" && (
          <p className="text-sm text-texto-suave">
            As telas que dependem do banco ficam indisponíveis até a configuração
            ser concluída. O catálogo continua funcionando.
          </p>
        )}

        <p className="text-xs text-texto-suave">
          Verificado em {saude.checkedAt} ·{" "}
          <Link href="/api/v1/health" className="underline underline-offset-4">
            /api/v1/health
          </Link>
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
          Começar
        </h2>
        <Link
          href="/catalogo"
          className="w-fit rounded-md border border-acento px-4 py-2 text-sm font-medium text-acento transition-colors hover:bg-acento hover:text-acento-contraste"
        >
          Buscar no catálogo
        </Link>
      </section>
    </main>
  );
}
