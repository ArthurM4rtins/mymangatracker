// Tentativas de login e cadastro (#108). A chave já vem como hash do domínio:
// nada aqui identifica pessoa em claro. Linha nova por tentativa; a leitura é
// sempre por (scope, key) dentro de uma janela — índice nessa direção.
import { getPrisma } from "./prisma";

export async function contarTentativas(
  escopo: string,
  chave: string,
  desde: Date,
): Promise<{ total: number; maisAntiga: Date | null }>
{
  const agregado = await getPrisma().authAttempt.aggregate({
    where: { scope: escopo, key: chave, createdAt: { gte: desde } },
    _count: { _all: true },
    _min: { createdAt: true },
  });

  return { total: agregado._count._all, maisAntiga: agregado._min.createdAt };
}

export async function registrarTentativa(escopo: string, chave: string): Promise<void>
{
  await getPrisma().authAttempt.create({ data: { scope: escopo, key: chave } });
}

/** Login que deu certo zera o par: quem entra de verdade não acumula. */
export async function limparTentativas(escopo: string, chave: string): Promise<void>
{
  await getPrisma().authAttempt.deleteMany({ where: { scope: escopo, key: chave } });
}
