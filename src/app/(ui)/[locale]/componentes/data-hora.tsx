"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";

/**
 * Data e hora no fuso de quem está lendo, no idioma de quem está lendo.
 *
 * O formatador é o `Intl` nativo, e não o `useFormatter()` do next-intl, de
 * propósito: o next-intl resolve o `timeZone` no SERVIDOR e o carrega até o
 * provider, então formatar por ele aqui daria a hora do servidor — UTC na
 * Vercel — em vez da hora de quem está lendo. Sem `timeZone` explícito, o
 * `Intl` usa o fuso de quem executa: UTC no servidor, o do navegador no
 * cliente, que é exatamente o que a D6 pede.
 *
 * Por isso o texto sai em UTC no primeiro render e o cliente corrige na
 * hidratação — daí o `suppressHydrationWarning`. O `dateTime` ISO é a fonte,
 * sempre exato.
 */
export function DataHora({ iso, className }: { iso: string; className?: string })
{
  const idioma = useLocale();
  const formato = useMemo(
    function ()
    {
      return new Intl.DateTimeFormat(idioma, { dateStyle: "short", timeStyle: "short" });
    },
    [idioma],
  );

  return (
    <time dateTime={iso} suppressHydrationWarning className={className}>
      {formato.format(new Date(iso))}
    </time>
  );
}
