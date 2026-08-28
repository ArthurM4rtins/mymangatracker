// Único ponto onde o Prisma Client é instanciado. O Prisma 7 exige um driver
// adapter — não existe mais o modo em que o próprio client abre a conexão.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

type ClientePrisma = ReturnType<typeof criarCliente>;

// Em desenvolvimento o Next recarrega os módulos a cada alteração. Sem guardar a
// instância no globalThis, cada reload abriria um pool novo até o Postgres recusar.
const escopoGlobal = globalThis as typeof globalThis & {
  __prisma?: ClientePrisma;
};

/**
 * Cliente compartilhado. Criado na primeira chamada, não no import — é o que
 * deixa o `next build` rodar sem DATABASE_URL.
 */
export function getPrisma(): ClientePrisma
{
  if (!escopoGlobal.__prisma)
  {
    escopoGlobal.__prisma = criarCliente();
  }

  return escopoGlobal.__prisma;
}

function criarCliente()
{
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString)
  {
    throw new Error(
      "DATABASE_URL ausente. Suba o banco com `docker compose up -d` e confira o `.env`.",
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
