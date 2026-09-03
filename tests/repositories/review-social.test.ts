import { beforeEach, describe, expect, it } from "vitest";
import { salvarMediaDoAniList } from "@/server/repositories/media.repository";
import { salvarAvaliacao } from "@/server/repositories/avaliacao.repository";
import {
  alternarCurtida,
  apagarComentario,
  comentarNaReview,
  listarReviewsDaObra,
} from "@/server/repositories/review-social.repository";
import { limparBanco, semearUsuario } from "./apoio";

// As regras da issue #39: resenha com texto é pública com username e NADA
// além (e-mail nunca sai). Nota sem texto não entra na lista. Curtida é
// toggle único; comentário alheio não é apagável.

const OBRA = {
  anilistId: 30013,
  type: "MANGA" as const,
  titleRomaji: "Vinland Saga",
  chapters: 224,
};

beforeEach(limparBanco);

async function semearReview(username: string, review: string | null)
{
  const usuario = await semearUsuario(username);
  const media = await salvarMediaDoAniList(OBRA, new Date());
  const entry = await salvarAvaliacao({
    userId: usuario.id,
    mediaId: media.id,
    rating: 4.5,
    review,
    containsSpoilers: false,
  });

  return { usuario, media, entry };
}

describe("listarReviewsDaObra", function ()
{
  it("mostra a resenha com username e sem NENHUM dado além do público", async function ()
  {
    const { usuario, media } = await semearReview("rankine", "obra-prima");
    const outro = await semearUsuario("leitor");

    const reviews = await listarReviewsDaObra(media.id, outro.id);

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toEqual({
      entryId: expect.any(String),
      username: "rankine",
      minha: false,
      rating: "4.5",
      review: "obra-prima",
      containsSpoilers: false,
      publicadaEm: expect.any(Date),
      curtidas: 0,
      curtiPorMim: false,
      comentarios: [],
    });
    expect(JSON.stringify(reviews)).not.toContain("@exemplo.test");
    expect(JSON.stringify(reviews)).not.toContain(usuario.id);
  });

  it("nota sem texto não entra na lista social", async function ()
  {
    const { media } = await semearReview("rankine", null);

    await expect(listarReviewsDaObra(media.id, null)).resolves.toEqual([]);
  });

  it("ordena por curtidas, desempate pelas recentes", async function ()
  {
    const { media } = await semearReview("primeiro", "resenha antiga");
    const segundo = await semearUsuario("segundo");
    const entry2 = await salvarAvaliacao({
      userId: segundo.id,
      mediaId: media.id,
      rating: null,
      review: "resenha curtida",
      containsSpoilers: false,
    });
    const fa = await semearUsuario("fa");
    await alternarCurtida(entry2.id, fa.id);

    const reviews = await listarReviewsDaObra(media.id, null);

    expect(reviews.map(function (r) { return r.username; })).toEqual([
      "segundo",
      "primeiro",
    ]);
  });
});

describe("alternarCurtida", function ()
{
  it("liga e desliga, nunca duplica", async function ()
  {
    const { media, entry } = await semearReview("rankine", "boa");
    const fa = await semearUsuario("fa");

    await expect(alternarCurtida(entry.id, fa.id)).resolves.toEqual({
      curtida: true,
      total: 1,
    });
    await expect(alternarCurtida(entry.id, fa.id)).resolves.toEqual({
      curtida: false,
      total: 0,
    });

    const [review] = await listarReviewsDaObra(media.id, fa.id);
    expect(review.curtidas).toBe(0);
  });

  it("resenha inexistente é null, não exceção", async function ()
  {
    const fa = await semearUsuario("fa");

    await expect(alternarCurtida("nao-existe", fa.id)).resolves.toBeNull();
  });
});

describe("comentarNaReview e apagarComentario", function ()
{
  it("comenta, aparece na lista em ordem, e só o dono apaga", async function ()
  {
    const { media, entry } = await semearReview("rankine", "boa");
    const leitor = await semearUsuario("leitor");
    const intruso = await semearUsuario("intruso");

    const comentario = await comentarNaReview(entry.id, leitor.id, "concordo!");
    expect(comentario).not.toBeNull();

    const [review] = await listarReviewsDaObra(media.id, leitor.id);
    expect(review.comentarios).toHaveLength(1);
    expect(review.comentarios[0]).toMatchObject({
      username: "leitor",
      texto: "concordo!",
      meu: true,
    });

    await expect(apagarComentario(intruso.id, comentario!.id)).resolves.toBeNull();
    await expect(apagarComentario(leitor.id, comentario!.id)).resolves.toEqual({
      removido: true,
    });
  });

  it("comentário em resenha inexistente é null", async function ()
  {
    const leitor = await semearUsuario("leitor");

    await expect(comentarNaReview("nao-existe", leitor.id, "oi")).resolves.toBeNull();
  });
});
