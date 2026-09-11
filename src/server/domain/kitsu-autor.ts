import { ehPapelDeAutoria, limparBiografia, type ObraDoAutor } from "./anilist-media";
import { traduzirDoKitsu, type RecursoKitsu } from "./kitsu-media";

export type AutorDoKitsu = {
  kitsuPersonId: number;
  nome: string;
  nomeNativo: string | null;
  imagemUrl: string | null;
  descricao: string | null;
  obras: ObraDoAutor[];
};

type RespostaDoAutorKitsu = { data?: RecursoKitsu | null; included?: RecursoKitsu[] };

function texto(valor: unknown): string | null
{
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : null;
}

/** Resolve cada papel pelo vínculo da pessoa e cada obra pelo par tipo/id. */
export function mapearAutorDoKitsu(corpo: RespostaDoAutorKitsu): AutorDoKitsu | null
{
  const pessoa = corpo.data;
  const id = Number(pessoa?.id);
  const nome = texto(pessoa?.attributes?.name);
  if (pessoa?.type !== "people" || !Number.isSafeInteger(id) || id <= 0 || !nome) return null;
  const imagem = pessoa.attributes?.image as Record<string, unknown> | null | undefined;
  const descricao = texto(pessoa.attributes?.description);
  const indice = new Map((corpo.included ?? []).map(r => [`${r.type}:${r.id}`, r]));
  const vinculos = pessoa.relationships?.staff?.data;
  const vistos = new Set<string>();
  const obras: Array<{ dados: ObraDoAutor; popularidade: number }> = [];
  for (const ref of Array.isArray(vinculos) ? vinculos : [])
  {
    const staff = indice.get(`${ref.type}:${ref.id}`);
    const papel = texto(staff?.attributes?.role);
    const mediaRef = staff?.relationships?.media?.data;
    if (!papel || !ehPapelDeAutoria(papel) || !mediaRef || Array.isArray(mediaRef) || mediaRef.type !== "manga") continue;
    const media = indice.get(`manga:${mediaRef.id}`);
    if (!media) continue;
    const obra = traduzirDoKitsu({ dados: { id: String(media.id), attributes: media.attributes ?? {} }, anilistId: null });
    if (!obra) continue;
    const chave = `kitsu:${obra.kitsuId}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    obras.push({
      dados: {
        chave, titleRomaji: obra.titleRomaji, titleEnglish: obra.titleEnglish ?? null,
        coverImageUrl: obra.coverImageUrl ?? null, startYear: obra.startYear ?? null, papel,
      },
      popularidade: typeof media.attributes?.userCount === "number" ? media.attributes.userCount : 0,
    });
  }
  obras.sort((a, b) => b.popularidade - a.popularidade);
  return {
    kitsuPersonId: id, nome, nomeNativo: null,
    // As miniaturas de alguns autores vêm estouradas; o original preserva a foto.
    imagemUrl: texto(imagem?.original) ?? texto(imagem?.medium) ?? texto(imagem?.large),
    descricao: descricao ? limparBiografia(descricao) || null : null,
    obras: obras.map(obra => obra.dados),
  };
}
