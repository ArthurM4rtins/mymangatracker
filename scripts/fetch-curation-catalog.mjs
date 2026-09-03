import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const QUERY = `query ($page: Int!) {
  Page(page: $page, perPage: 50) {
    media(type: MANGA, sort: POPULARITY_DESC, isAdult: false) {
      id
      title { romaji english native }
      format
      countryOfOrigin
      chapters
      status
    }
  }
}`;

const raiz = join(process.cwd(), "data", "story-structures");
const diretorioTitulos = join(raiz, "titles");
const arquivoProgresso = join(raiz, "progress.json");

if (await existe(arquivoProgresso))
{
  throw new Error("Fila de curadoria já existe; atualizações incrementais exigem outro script.");
}

await mkdir(diretorioTitulos, { recursive: true });

const respostas = await Promise.all([buscar(1), buscar(2)]);
const obras = respostas.flatMap((resposta) => resposta.data.Page.media).slice(0, 100);

await escrever(join(raiz, "catalog-snapshot.json"), {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  selection: "AniList MANGA, POPULARITY_DESC, isAdult: false",
  works: obras.map(resumir),
});

await escrever(arquivoProgresso, {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  targetCount: obras.length,
  counts: { pending: obras.length, verified: 0, draft: 0, disputed: 0, insufficientEvidence: 0, notApplicable: 0 },
  nextAnilistId: obras[0]?.id ?? null,
});

await Promise.all(obras.map(async (obra) => {
  const arquivo = join(diretorioTitulos, `${obra.id}.json`);

  if (!(await existe(arquivo)))
  {
    await escrever(arquivo, {
      schemaVersion: 1,
      media: resumir(obra),
      numberingBasis: "ORIGINAL_SERIALIZATION",
      curation: { status: "DRAFT", researchedAt: null },
      sources: [],
      segments: [],
      conflicts: [],
    });
  }
}));

console.log(`Fila criada com ${obras.length} obras em ${raiz}`);

async function buscar(page)
{
  const resposta = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { page } }),
  });

  if (!resposta.ok)
  {
    throw new Error(`AniList respondeu ${resposta.status}`);
  }

  const corpo = await resposta.json();

  if (Array.isArray(corpo.errors))
  {
    throw new Error("AniList devolveu erro GraphQL");
  }

  return corpo;
}

function resumir(obra)
{
  return {
    anilistId: obra.id,
    title: obra.title.english ?? obra.title.romaji,
    titleRomaji: obra.title.romaji,
    format: obra.format,
    countryOfOrigin: obra.countryOfOrigin,
    chapters: obra.chapters,
    status: obra.status,
  };
}

async function escrever(caminho, conteudo)
{
  await writeFile(caminho, `${JSON.stringify(conteudo, null, 2)}\n`, "utf8");
}

async function existe(caminho)
{
  try
  {
    await access(caminho);
    return true;
  }
  catch
  {
    return false;
  }
}
