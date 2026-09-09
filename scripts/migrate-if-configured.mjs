// O build da Vercel roda sem banco na primeira vez: o projeto e importado, buildado
// e so depois o Neon e conectado. Entao a migration so pode rodar quando DATABASE_URL
// existir — caso contrario `next build` quebraria e nao haveria deploy nenhum.
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL;
const ambiente = process.env.VERCEL_ENV;

if (!url)
{
  console.log(
    "[migrate] DATABASE_URL ausente — pulando `prisma migrate deploy`. " +
      "O build segue; as telas que leem banco degradam com aviso de configuracao pendente.",
  );
  process.exit(0);
}

// Segunda condicao (#148, item 8): so producao — ou fora da Vercel, que e' o
// desenvolvimento local. A presenca da variavel era a UNICA condicao, entao um
// Preview cujo DATABASE_URL apontasse para producao aplicaria DDL nao revisado
// antes de qualquer review. O README promete branch Neon por PR, mas promessa de
// configuracao nao e' guarda de codigo.
if (ambiente !== undefined && ambiente !== "production")
{
  console.log(
    `[migrate] VERCEL_ENV=${ambiente} — pulando \`prisma migrate deploy\`. ` +
      "Migration so roda em producao; preview usa o banco que a integracao apontar, sem DDL.",
  );
  process.exit(0);
}

console.log("[migrate] DATABASE_URL presente e ambiente de producao — aplicando migrations.");

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
