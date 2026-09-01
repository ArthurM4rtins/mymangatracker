"use client";

/**
 * As estrelas do rating, compartilhadas entre estante e página da obra:
 * meia estrela por clique (duas metades clicáveis por estrela).
 */

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
  return (
    <div className="flex items-center gap-2">
      <div role="group" aria-label="Nota de 0,5 a 5" className="flex">
        {[1, 2, 3, 4, 5].map(function (estrela)
        {
          const cheia = nota !== null && nota >= estrela;
          const metade = nota !== null && nota === estrela - 0.5;

          return (
            <span key={estrela} className={`relative leading-none ${tamanho}`}>
              <span aria-hidden className={cheia ? "text-acento" : "text-borda"}>
                ★
              </span>
              {metade && (
                <span
                  aria-hidden
                  className="absolute inset-0 w-1/2 overflow-hidden text-acento"
                >
                  ★
                </span>
              )}
              <button
                type="button"
                aria-label={`${estrela - 0.5} estrelas`}
                onClick={function () { aoEscolher(estrela - 0.5); }}
                className="absolute inset-y-0 left-0 w-1/2"
              />
              <button
                type="button"
                aria-label={`${estrela} estrelas`}
                onClick={function () { aoEscolher(estrela); }}
                className="absolute inset-y-0 right-0 w-1/2"
              />
            </span>
          );
        })}
      </div>
      <span className="text-xs tabular-nums text-texto-suave">
        {nota === null ? "sem nota" : nota.toLocaleString("pt-BR")}
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
  return "★".repeat(Math.floor(nota)) + (nota % 1 !== 0 ? "½" : "");
}
