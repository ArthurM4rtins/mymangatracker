// O build da Vercel roda sem banco na primeira vez: o projeto e importado, buildado
// e so depois o Neon e conectado. Entao a migration so pode rodar quando DATABASE_URL
// existir — caso contrario `next build` quebraria e nao haveria deploy nenhum.
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL;

if (!url)
{
  console.log(
    "[migrate] DATABASE_URL ausente — pulando `prisma migrate deploy`. " +
      "O build segue; as telas que leem banco degradam com aviso de configuracao pendente.",
  );
  process.exit(0);
}

console.log("[migrate] DATABASE_URL presente — aplicando migrations.");

const result = spawnSync(
  "prisma",
  ["migrate", "deploy"],
  { stdio: "inherit", shell: true },
);

if (result.error)
{
  console.error("[migrate] falha ao executar o Prisma CLI:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
