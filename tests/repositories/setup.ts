// Roda antes dos testes de repositório. Promove DATABASE_URL_TEST a DATABASE_URL
// só dentro deste processo, para que o cliente do Prisma abra no banco de teste e
// nunca no de desenvolvimento.
import "dotenv/config";

const url = process.env.DATABASE_URL_TEST;

if (!url)
{
  throw new Error(
    "DATABASE_URL_TEST ausente. Copie a linha do `.env.example` para o seu `.env`.",
  );
}

process.env.DATABASE_URL = url;
