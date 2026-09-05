/**
 * Caso de uso: criar conta.
 *
 * A senha em texto morre aqui: o que desce para o repositório é o hash scrypt.
 * O repositório entra injetado para o teste rodar sem banco; a validação de
 * formato (tamanho, e-mail válido) é do controller, com Zod — aqui só a regra.
 */
import { gerarHashDeSenha } from "@/server/domain/senha";
import { normalizarUsername } from "@/server/domain/username";
import {
  criarUsuario as criarUsuarioNoBanco,
  type NovoUsuario,
  type UsuarioPublico,
} from "@/server/repositories/usuario.repository";

export type Cadastro = {
  username: string;
  email: string;
  senha: string;
};

export type DependenciasDoCadastro = {
  criarUsuario: (dados: NovoUsuario) => Promise<UsuarioPublico>;
  gerarHash?: (senha: string) => Promise<string>;
};

export async function cadastrarUsuario(
  entrada: Cadastro,
  deps: DependenciasDoCadastro,
): Promise<UsuarioPublico>
{
  const gerarHash = deps.gerarHash ?? gerarHashDeSenha;

  const passwordHash = await gerarHash(entrada.senha);

  // E-mail é identidade de login: minúsculas para "Foo@x" e "foo@x" não virarem
  // duas contas. Username preserva o que o usuário digitou para exibição, e a
  // forma normalizada é a identidade (#114): "Leitor" e "leitor" são um só.
  return deps.criarUsuario({
    username: entrada.username,
    usernameNormalizado: normalizarUsername(entrada.username),
    email: entrada.email.toLowerCase(),
    passwordHash,
  });
}

/** A composição de produção: serviço + repositório de verdade. */
export function cadastrarUsuarioNoSistema(entrada: Cadastro): Promise<UsuarioPublico>
{
  return cadastrarUsuario(entrada, { criarUsuario: criarUsuarioNoBanco });
}
