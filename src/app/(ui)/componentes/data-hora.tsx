"use client";

/**
 * Data e hora no fuso de quem está lendo. No servidor (UTC na Vercel) o
 * texto sai em UTC e o cliente corrige na hidratação — por isso o
 * `suppressHydrationWarning`. O `dateTime` ISO é a fonte, sempre exato.
 */
const FORMATO = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function DataHora({ iso, className }: { iso: string; className?: string })
{
  return (
    <time dateTime={iso} suppressHydrationWarning className={className}>
      {FORMATO.format(new Date(iso))}
    </time>
  );
}
