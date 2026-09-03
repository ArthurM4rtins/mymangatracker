/**
 * Regras puras de seguir e curtir perfil (issue #74). Relação é entre DOIS
 * usuários: a si mesmo não. O banco trava com CHECK; aqui a resposta vem com
 * nome antes de bater lá.
 */
export function podeSeRelacionar(userId: string, alvoId: string): boolean
{
  return userId !== alvoId;
}
