/**
 * A descrição do AniList para a tela (issue #45): fora o sufixo
 * "(Source: X)", e o bloco "Notes:" vira lista de tópicos.
 */

export type DescricaoInterpretada = {
  sinopse: string;
  notas: string[];
};

export function interpretarDescricao(texto: string): DescricaoInterpretada
{
  const semSource = texto.replace(/\(source:[^)]*\)/gi, "");

  const notas: string[] = [];
  const partes = semSource.split(/^\s*notes?:\s*$/im);
  const sinopse = partes[0].trim();

  if (partes.length > 1)
  {
    partes
      .slice(1)
      .join("\n")
      .split("\n")
      .forEach(function (linha)
      {
        const limpa = linha.replace(/^\s*[-•]\s*/, "").trim();

        if (limpa !== "")
        {
          notas.push(limpa);
        }
      });
  }

  return { sinopse, notas };
}
