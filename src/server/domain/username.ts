/**
 * A identidade de um username (#114). `User.username` guarda o que a pessoa
 * digitou, para exibição; `User.usernameNormalizado` guarda esta forma, e é
 * ela que é única e que resolve `/u/:username`, login por username (se vier)
 * e a foto. "Leitor" e "leitor" são a mesma pessoa.
 */
export function normalizarUsername(username: string): string
{
  return username.trim().toLowerCase();
}
