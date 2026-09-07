"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Idioma } from "@/i18n/routing";

/** Sigla curta no botão; o nome inteiro fica no `title` e no leitor de tela. */
const SIGLAS: Record<string, string> = { "pt-BR": "PT", en: "EN" };

export function SeletorIdioma()
{
  const idiomaAtivo = useLocale();
  const caminho = usePathname();
  const busca = useSearchParams();
  const roteador = useRouter();
  const [trocando, iniciarTroca] = useTransition();
  const t = useTranslations("cabecalho");

  function trocar(idioma: Idioma)
  {
    if (idioma === idiomaAtivo)
    {
      return;
    }

    // `usePathname` do next-intl devolve o caminho SEM o prefixo; o router
    // recoloca o do idioma pedido. A query segue junto para o filtro não sumir.
    const consulta = busca.toString();
    const destino = consulta === "" ? caminho : `${caminho}?${consulta}`;

    iniciarTroca(function ()
    {
      roteador.replace(destino, { locale: idioma });
    });
  }

  return (
    <div role="group" aria-label={t("idioma")} className="flex items-center gap-1">
      {routing.locales.map(function (idioma)
      {
        const selecionado = idioma === idiomaAtivo;

        return (
          <button
            key={idioma}
            type="button"
            lang={idioma}
            onClick={function ()
            {
              trocar(idioma);
            }}
            disabled={trocando}
            aria-pressed={selecionado}
            title={t(`idiomas.${idioma}`)}
            className={`rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-60 ${
              selecionado
                ? "text-texto"
                : "text-texto-suave hover:text-texto"
            }`}
          >
            {SIGLAS[idioma] ?? idioma}
          </button>
        );
      })}
    </div>
  );
}
