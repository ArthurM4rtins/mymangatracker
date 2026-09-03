"use client";

/**
 * Bio do autor com "ver mais" (issue #69). Sem JS o texto fica clampado em
 * seis linhas, como antes; com JS, o botão só aparece quando o clamp de fato
 * cortou alguma coisa — bio curta não ganha botão à toa.
 */
import { useEffect, useRef, useState } from "react";

export function BioDoAutor({ texto }: { texto: string })
{
  const paragrafo = useRef<HTMLParagraphElement>(null);
  const [aberta, setAberta] = useState(false);
  const [cortada, setCortada] = useState(false);

  useEffect(function ()
  {
    const elemento = paragrafo.current;

    if (elemento === null)
    {
      return;
    }

    function medir()
    {
      if (elemento !== null && !aberta)
      {
        setCortada(elemento.scrollHeight > elemento.clientHeight + 1);
      }
    }

    medir();
    window.addEventListener("resize", medir);

    return function ()
    {
      window.removeEventListener("resize", medir);
    };
  }, [aberta]);

  return (
    <div className="flex max-w-2xl flex-col items-start gap-1">
      <p
        ref={paragrafo}
        className={`${aberta ? "" : "line-clamp-6 "}whitespace-pre-line text-sm leading-relaxed text-texto-suave`}
      >
        {texto}
      </p>

      {(cortada || aberta) && (
        <button
          type="button"
          aria-expanded={aberta}
          onClick={function () { setAberta(!aberta); }}
          className="text-xs font-medium text-acento hover:underline"
        >
          {aberta ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </div>
  );
}
