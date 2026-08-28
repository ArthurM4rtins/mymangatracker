// Aplica as migrations no banco de teste antes do `pnpm test:db`.
//
// O Prisma lê DATABASE_URL, então aqui a variável do banco de teste é promovida
// a DATABASE_URL só para o processo filho — o `.env` do desenvolvimento continua
// intocado, e nada aponta para o banco de verdade por acidente.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SUFIXO_OBRIGATORIO = "_test";

carregarEnvLocal();

const url = process.env.DATABASE_URL_TEST;

if (!url)
{
  console.error(
    "[test-db] DATABASE_URL_TEST ausente. Copie a linha do `.env.example` para o seu `.env`.",
  );
  process.exit(1);
}

if (!nomeDoBanco(url).endsWith(SUFIXO_OBRIGATORIO))
{
  console.error(
    `[test-db] recusado: o banco de teste precisa terminar em "${SUFIXO_OBRIGATORIO}". ` +
      "A suíte apaga e recria dados — apontar para outro banco perderia dados de verdade.",
  );
  process.exit(1);
}

const result = spawnSync("prisma", ["migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: url },
});

if (result.error)
{
  console.error("[test-db] falha ao executar o Prisma CLI:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

function nomeDoBanco(valor)
{
  try
  {
    return new URL(valor).pathname.replace(/^\//, "");
  }
  catch
  {
    return "";
  }
}

// dotenv só entra pelo `prisma7.config.ts`, que roda no processo filho. Aqui a
// leitura é manual para poder validar antes de disparar qualquer coisa.
function carregarEnvLocal()
{
  let conteudo;

  try
  {
    conteudo = readFileSync(".env", "utf8");
  }
  catch
  {
    return;
  }

  for (const linha of conteudo.split(/\r?\n/))
  {
    const par = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linha);

    if (par && process.env[par[1]] === undefined)
    {
      process.env[par[1]] = par[2].replace(/^["']|["']$/g, "");
    }
  }
}
