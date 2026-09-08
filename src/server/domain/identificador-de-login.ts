/**
 * Como interpretar o que a pessoa digitou para entrar (#166).
 *
 * O campo é um só e aceita e-mail ou nome de usuário. A regra é a presença da
 * arroba: username não pode ter arroba, então não há ambiguidade real. Validar
 * formato de e-mail aqui seria pior — entrada malformada ganharia uma resposta
 * diferente de "não existe", e isso é exatamente a enumeração que o login
 * evita desde a #8.
 *
 * Módulo de domínio: puro, sem import do projeto, sem rede.
 */

export type IdentificadorDeLogin =
  | { tipo: "email"; valor: string }
  | { tipo: "username"; valor: string };

/**
 * O identificador normalizado, ou `null` quando não veio nada.
 *
 * As duas formas normalizam igual — trim e minúsculas —, mas por motivos
 * diferentes: e-mail porque o cadastro grava assim, username porque
 * `usernameNormalizado` é a coluna única desde a #114.
 */
export function interpretarIdentificador(
  valor: string,
): IdentificadorDeLogin | null
{
  const limpo = valor.trim().toLowerCase();

  if (limpo === "")
  {
    return null;
  }

  return limpo.includes("@")
    ? { tipo: "email", valor: limpo }
    : { tipo: "username", valor: limpo };
}
