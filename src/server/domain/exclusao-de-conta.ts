/**
 * A confirmação para apagar a conta (issue #208).
 *
 * Apagar é irreversível e leva tudo em cascata: estante, listas, avaliações,
 * curtidas, progresso, fontes — e os comentários que OUTRAS pessoas escreveram
 * nas resenhas de quem sai. Decisão registrada na issue em 09/09/2026.
 *
 * Por isso a confirmação não é um "tem certeza?": a pessoa digita o próprio
 * nome de usuário. O objetivo é obrigar a parar e ler, não provar identidade —
 * quem está logado já provou quem é.
 *
 * Módulo de domínio: puro, sem import do projeto.
 */

/** A mesma identidade do #114: "Leitora" e "leitora" são a mesma pessoa. */
function normalizar(valor: string): string
{
  return valor.trim().toLowerCase();
}

export function confirmacaoConfere(digitado: string, username: string): boolean
{
  const alvo = normalizar(username);

  // Vazio nunca confere, nem contra um username vazio: sem isto, um bug que
  // zerasse o nome transformaria "confirmar" em apertar enter sem digitar nada.
  if (alvo === "")
  {
    return false;
  }

  return normalizar(digitado) === alvo;
}
