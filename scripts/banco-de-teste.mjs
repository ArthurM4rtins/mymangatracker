// A guarda do banco de teste, num lugar só (#148, item 7).
//
// Antes a checagem do sufixo morava no script que NAO apaga nada
// (`migrate-test-db.mjs`), enquanto quem apaga e' `tests/repositories/apoio.ts`,
// com treze `deleteMany()` sem filtro terminando em `user.deleteMany()`. E o
// `vitest.db.config.mts` e' invocavel direto — pela extensao do VS Code, ou por
// `vitest run --config` —, pulando o script inteiro. A guarda so era encadeada
// pelo `package.json`.
//
// Agora o setup dos testes importa daqui, entao a suite recusa rodar contra um
// banco sem o sufixo mesmo quando ninguem passa pelo script.
export const SUFIXO_OBRIGATORIO = "_test";

export function nomeDoBanco(valor)
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

/** A URL do banco de teste, ou uma exceção dizendo o que fazer. */
export function urlDoBancoDeTeste(env)
{
  const url = env.DATABASE_URL_TEST;

  if (!url)
  {
    throw new Error(
      "DATABASE_URL_TEST ausente. Copie a linha do `.env.example` para o seu `.env`.",
    );
  }

  if (!nomeDoBanco(url).endsWith(SUFIXO_OBRIGATORIO))
  {
    throw new Error(
      `Recusado: o banco de teste precisa terminar em "${SUFIXO_OBRIGATORIO}". ` +
        "A suíte apaga e recria dados — apontar para outro banco perderia dados de verdade.",
    );
  }

  return url;
}
