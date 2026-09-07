"use client";

/**
 * O rating do Kidoku, compartilhado entre estante e página da obra: meia em
 * meia (duas metades clicáveis por símbolo), com preview no hover — passar o
 * mouse preenche, clicar confirma.
 *
 * O glyph vive num lugar só: trocar SIMBOLO muda o site inteiro.
 */
import { useState } from "react";

export const SIMBOLO = "✦";

export function SeletorDeEstrelas({
  nota,
  aoEscolher,
  tamanho = "text-xl",
}: {
  nota: number | null;
  aoEscolher: (nota: number | null) => void;
  tamanho?: string;
})
{
  const [preview, setPreview] = useState<number | null>(null);
  const exibida = preview ?? nota;

  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label="Nota de 0,5 a 5"
        className="flex"
        onMouseLeave={function () { setPreview(null); }}
      >
        {[1, 2, 3, 4, 5].map(function (posicao)
        {
          const cheia = exibida !== null && exibida >= posicao;
          const metade = exibida !== null && exibida === posicao - 0.5;

          return (
            <span key={posicao} className={`relative leading-none ${tamanho}`}>
              <span
                aria-hidden
                className={`transition-colors ${cheia ? "text-acento" : "text-borda"}`}
              >
                {SIMBOLO}
              </span>
              {metade && (
                <span
                  aria-hidden
                  className="absolute inset-0 w-1/2 overflow-hidden text-acento"
                >
                  {SIMBOLO}
                </span>
              )}
              <button
                type="button"
                aria-label={`${posicao - 0.5} de 5`}
                onMouseEnter={function () { setPreview(posicao - 0.5); }}
                onFocus={function () { setPreview(posicao - 0.5); }}
                onClick={function () { aoEscolher(posicao - 0.5); }}
                className="absolute inset-y-0 left-0 w-1/2"
              />
              <button
                type="button"
                aria-label={`${posicao} de 5`}
                onMouseEnter={function () { setPreview(posicao); }}
                onFocus={function () { setPreview(posicao); }}
                onClick={function () { aoEscolher(posicao); }}
                className="absolute inset-y-0 right-0 w-1/2"
              />
            </span>
          );
        })}
      </div>
      <span className="text-xs tabular-nums text-texto-suave">
        {exibida === null ? "sem nota" : exibida.toLocaleString("pt-BR")}
      </span>
      {nota !== null && (
        <button
          type="button"
          onClick={function () { aoEscolher(null); }}
          className="text-xs text-texto-suave underline underline-offset-4"
        >
          limpar
        </button>
      )}
    </div>
  );
}

export function estrelasTexto(nota: number): string
{
  return SIMBOLO.repeat(Math.floor(nota)) + (nota % 1 !== 0 ? "½" : "");
}
