"use client";

/**
 * A busca da própria lista (#237): o termo vai para a URL (`?q=`) com debounce
 * e o servidor re-renderiza a página com o resultado — o mesmo desenho da busca
 * do catálogo, pelo mesmo motivo (cota do AniList, URL como fonte de verdade).
 */
import { useTranslations } from "next-intl";
import { useEffect, useRef, useTransition } from "react";

import { useRouter } from "@/i18n/navigation";

const DEBOUNCE_MS = 400;

export function BuscaDaLista({ listaId, termoInicial }: { listaId: string; termoInicial: string })
{
  const roteador = useRouter();
  const t = useTranslations("listas");
  const [pendente, iniciarTransicao] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const caminho = `/listas/${listaId}`;

  useEffect(function ()
  {
    return function ()
    {
      if (temporizador.current !== null)
      {
        clearTimeout(temporizador.current);
      }
    };
  }, []);

  function cancelarDebounce()
  {
    if (temporizador.current !== null)
    {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
  }

  function buscar(valor: string)
  {
    const limpo = valor.trim();

    // `replace` para o histórico não virar uma pilha de termos parciais.
    iniciarTransicao(function ()
    {
      roteador.replace(limpo === "" ? caminho : `${caminho}?q=${encodeURIComponent(limpo)}`);
    });
  }

  function aoDigitar(valor: string)
  {
    cancelarDebounce();
    temporizador.current = setTimeout(function () { buscar(valor); }, DEBOUNCE_MS);
  }

  function aoSubmeter(evento: React.FormEvent<HTMLFormElement>)
  {
    evento.preventDefault();
    cancelarDebounce();
    const termo = new FormData(evento.currentTarget).get("q");
    buscar(typeof termo === "string" ? termo : "");
  }

  return (
    <form
      action={caminho}
      method="get"
      onSubmit={aoSubmeter}
      className="flex items-center gap-2"
    >
      <input
        type="search"
        name="q"
        defaultValue={termoInicial}
        onChange={function (evento) { aoDigitar(evento.target.value); }}
        placeholder={t("detalhe.busca.placeholder")}
        aria-label={t("detalhe.busca.rotulo")}
        autoComplete="off"
        className="flex-1 rounded-md border border-borda bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
      />
      <span
        aria-hidden={!pendente}
        className={`text-xs text-texto-suave transition-opacity ${pendente ? "opacity-100" : "opacity-0"}`}
      >
        {t("detalhe.busca.buscando")}
      </span>
    </form>
  );
}
