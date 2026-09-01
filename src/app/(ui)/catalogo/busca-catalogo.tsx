"use client";

/**
 * Busca ao digitar: o termo vai para a URL (`?q=`) com debounce, e o servidor
 * re-renderiza a página com o resultado. A URL segue sendo a fonte de verdade —
 * busca compartilhável, recarregável e funcional sem JS via GET do form.
 *
 * O debounce existe por causa da cota do AniList: cada tecla sem ele seria uma
 * requisição no servidor.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

const DEBOUNCE_MS = 400;

export function BuscaCatalogo({ termoInicial }: { termoInicial: string })
{
  const roteador = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function aoDigitar(valor: string)
  {
    if (temporizador.current !== null)
    {
      clearTimeout(temporizador.current);
    }

    temporizador.current = setTimeout(function ()
    {
      const limpo = valor.trim();
      const destino =
        limpo === "" ? "/catalogo" : `/catalogo?q=${encodeURIComponent(limpo)}`;

      // `replace` para o histórico não virar uma pilha de termos parciais.
      iniciarTransicao(function ()
      {
        roteador.replace(destino);
      });
    }, DEBOUNCE_MS);
  }

  return (
    <form action="/catalogo" method="get" className="flex items-center gap-2">
      <input
        type="search"
        name="q"
        defaultValue={termoInicial}
        onChange={function (evento) { aoDigitar(evento.target.value); }}
        placeholder="Lookism, Solo Leveling, Berserk…"
        aria-label="Buscar obra"
        autoComplete="off"
        className="flex-1 rounded-md border border-borda bg-superficie px-3 py-2 text-sm outline-none focus:border-acento"
      />
      <span
        aria-hidden={!pendente}
        className={`text-xs text-texto-suave transition-opacity ${pendente ? "opacity-100" : "opacity-0"}`}
      >
        Buscando…
      </span>
    </form>
  );
}
