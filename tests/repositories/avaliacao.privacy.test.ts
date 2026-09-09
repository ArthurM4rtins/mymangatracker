import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "@/server/repositories/prisma";
import { salvarMediaDoAniList } from "@/server/repositories/media.repository";
import {
  listarAvaliacoes,
  removerAvaliacao,
  salvarAvaliacao,
} from "@/server/repositories/avaliacao.repository";
import {
  alternarCurtida,
  comentarNaReview,
} from "@/server/repositories/review-social.repository";
import { limparBanco, semearUsuario } from "./apoio";

// As regras de banco da issue #33: uma avaliação por (userId, mediaId) —
// avaliar de novo edita, nunca duplica. Avaliação de um usuário não aparece
// nem é removível por outro. O CHECK da meia estrela vive no banco.

const OBRA = {
  anilistId: 30013,
  type: "MANGA" as const,
  titleRomaji: "Vinland Saga",
  chapters: 224,
};

beforeEach(limparBanco);

describe("salvarAvaliacao", function ()
{
  it("avaliar de novo edita a mesma linha, nunca duplica", async function ()
  {
    const usuario = await semearUsuario("rankine");
    const media = await salvarMediaDoAniList(OBRA, new Date());

    const primeira = await salvarAvaliacao({
      userId: usuario.id,
      mediaId: media.id,
      rating: 4.5,
      review: null,
      containsSpoilers: false,
    });
    const segunda = await salvarAvaliacao({
      userId: usuario.id,
      mediaId: media.id,
      rating: 5,
      review: "obra-prima",
      containsSpoilers: true,
    });

    expect(segunda.id).toBe(primeira.id);
    expect(await getPrisma().entry.count()).toBe(1);

    const [avaliacao] = await listarAvaliacoes(usuario.id);
    expect(avaliacao).toEqual({
      mediaId: media.id,
      rating: "5",
      review: "obra-prima",
      containsSpoilers: true,
    });
  });

  // #143, revisitando a #111: a data PUBLICA da resenha e carimbada uma vez, na
  // transicao de vazio para texto, e nunca mais. `reviewedAt` continua existindo
  // como historico da linha, mas nenhuma superficie publica olha para ele.
  //
  // A regra esta em `Obsidian/03. Regras de Negocio/data-de-publicacao-da-resenha.md`.
  describe("publishedAt", function ()
  {
    const ANTIGO = new Date("2026-01-05T12:00:00.000Z");

    async function retroagir(entryId: string)
    {
      await getPrisma().entry.update({
        where: { id: entryId },
        data: { publishedAt: ANTIGO, reviewedAt: ANTIGO },
      });
    }

    async function publishedAtDe(entryId: string)
    {
      const linha = await getPrisma().entry.findUniqueOrThrow({
        where: { id: entryId },
        select: { publishedAt: true },
      });
      return linha.publishedAt;
    }

    it("nota sozinha nao publica nada", async function ()
    {
      const usuario = await semearUsuario("rankine");
      const media = await salvarMediaDoAniList(OBRA, new Date());

      const { id } = await salvarAvaliacao({
        userId: usuario.id,
        mediaId: media.id,
        rating: 5,
        review: null,
        containsSpoilers: false,
      });

      expect(await publishedAtDe(id)).toBeNull();
    });

    it("carimba quando a resenha nasce depois da nota", async function ()
    {
      const usuario = await semearUsuario("rankine");
      const media = await salvarMediaDoAniList(OBRA, new Date());
      const base = { userId: usuario.id, mediaId: media.id, containsSpoilers: false };

      const { id } = await salvarAvaliacao({ ...base, rating: 5, review: null });
      await getPrisma().entry.update({ where: { id }, data: { reviewedAt: ANTIGO } });

      await salvarAvaliacao({ ...base, rating: 5, review: "escrita hoje" });

      const publicada = await publishedAtDe(id);
      expect(publicada).not.toBeNull();
      expect((publicada as Date).getTime()).toBeGreaterThan(ANTIGO.getTime());
    });

    it("nao mexe quando so a nota muda", async function ()
    {
      const usuario = await semearUsuario("rankine");
      const media = await salvarMediaDoAniList(OBRA, new Date());
      const base = { userId: usuario.id, mediaId: media.id, containsSpoilers: false };

      const { id } = await salvarAvaliacao({ ...base, rating: 5, review: "texto" });
      await retroagir(id);

      await salvarAvaliacao({ ...base, rating: 3, review: "texto" });

      expect(await publishedAtDe(id)).toEqual(ANTIGO);
    });

    it("nao mexe quando o texto e editado", async function ()
    {
      const usuario = await semearUsuario("rankine");
      const media = await salvarMediaDoAniList(OBRA, new Date());
      const base = { userId: usuario.id, mediaId: media.id, containsSpoilers: false };

      const { id } = await salvarAvaliacao({ ...base, rating: 5, review: "texto" });
      await retroagir(id);

      await salvarAvaliacao({ ...base, rating: 5, review: "texto corrigido" });

      expect(await publishedAtDe(id)).toEqual(ANTIGO);
    });

    // O buraco da #143: isto ANTES recarimbava a data e levava a resenha ao topo
    // do feed, em duas requisicoes, quantas vezes o dono quisesse.
    it("apagar o texto e escrever de novo NAO recarimba", async function ()
    {
      const usuario = await semearUsuario("rankine");
      const media = await salvarMediaDoAniList(OBRA, new Date());
      const base = { userId: usuario.id, mediaId: media.id, containsSpoilers: false };

      const { id } = await salvarAvaliacao({ ...base, rating: 5, review: "texto" });
      await retroagir(id);

      await salvarAvaliacao({ ...base, rating: 5, review: null });
      await salvarAvaliacao({ ...base, rating: 5, review: "texto de novo" });

      expect(await publishedAtDe(id)).toEqual(ANTIGO);
    });
  });

  // #112: curtida e comentario sao sobre o TEXTO da resenha. Apagar o texto
  // (mantendo a nota) leva o social junto; senao ele ressurgia colado num
  // texto novo e diferente. Editar o texto mantem.
  describe("social morre com o texto", function ()
  {
    async function contarSocial(entryId: string)
    {
      const prisma = getPrisma();
      return {
        curtidas: await prisma.reviewLike.count({ where: { entryId } }),
        comentarios: await prisma.reviewComment.count({ where: { entryId } }),
      };
    }

    it("apagar o texto apaga curtidas e comentarios, e a nota fica", async function ()
    {
      const dono = await semearUsuario("dono");
      const leitor = await semearUsuario("leitor");
      const media = await salvarMediaDoAniList(OBRA, new Date());
      const base = { userId: dono.id, mediaId: media.id, containsSpoilers: false };

      const { id } = await salvarAvaliacao({ ...base, rating: 5, review: "texto" });
      await alternarCurtida(id, leitor.id);
      await comentarNaReview(id, leitor.id, "concordo");
      expect(await contarSocial(id)).toEqual({ curtidas: 1, comentarios: 1 });

      await salvarAvaliacao({ ...base, rating: 5, review: null });

      expect(await contarSocial(id)).toEqual({ curtidas: 0, comentarios: 0 });
      const [avaliacao] = await listarAvaliacoes(dono.id);
      expect(avaliacao).toMatchObject({ rating: "5", review: null });
    });

    it("editar o texto mantem curtidas e comentarios", async function ()
    {
      const dono = await semearUsuario("dono");
      const leitor = await semearUsuario("leitor");
      const media = await salvarMediaDoAniList(OBRA, new Date());
      const base = { userId: dono.id, mediaId: media.id, containsSpoilers: false };

      const { id } = await salvarAvaliacao({ ...base, rating: 5, review: "texto" });
      await alternarCurtida(id, leitor.id);
      await comentarNaReview(id, leitor.id, "concordo");

      await salvarAvaliacao({ ...base, rating: 4, review: "texto corrigido" });

      expect(await contarSocial(id)).toEqual({ curtidas: 1, comentarios: 1 });
    });

    // #138: a purga do #112 fechava so a saida. Entre apagar o texto e
    // escrever outro, a linha Entry continua existindo e o id dela ja foi
    // entregue ao navegador de quem leu a resenha publica — quem guardou o id
    // curtia e comentava numa resenha que nao existe, e o social ressurgia
    // colado no texto novo do dono. Duas defesas: recusar a escrita, e purgar
    // tambem no renascimento.
    it("comentario e curtida sao recusados quando a Entry esta sem resenha", async function ()
    {
      const dono = await semearUsuario("dono");
      const leitor = await semearUsuario("leitor");
      const media = await salvarMediaDoAniList(OBRA, new Date());
      const base = { userId: dono.id, mediaId: media.id, containsSpoilers: false };

      const { id } = await salvarAvaliacao({ ...base, rating: 5, review: "texto" });
      await salvarAvaliacao({ ...base, rating: 5, review: null });

      await expect(alternarCurtida(id, leitor.id)).resolves.toBeNull();
      await expect(comentarNaReview(id, leitor.id, "colado")).resolves.toBeNull();
      expect(await contarSocial(id)).toEqual({ curtidas: 0, comentarios: 0 });
    });

    it("resenha nova nao herda o social gravado enquanto a Entry estava sem texto", async function ()
    {
      const dono = await semearUsuario("dono");
      const leitor = await semearUsuario("leitor");
      const media = await salvarMediaDoAniList(OBRA, new Date());
      const base = { userId: dono.id, mediaId: media.id, containsSpoilers: false };

      const { id } = await salvarAvaliacao({ ...base, rating: 5, review: "texto" });
      await salvarAvaliacao({ ...base, rating: 5, review: null });

      // Escrita direta: prova que o renascimento purga mesmo se a defesa da
      // borda falhar ou se a linha vier de antes desta correcao.
      const prisma = getPrisma();
      await prisma.reviewLike.create({ data: { entryId: id, userId: leitor.id } });
      await prisma.reviewComment.create({
        data: { entryId: id, userId: leitor.id, texto: "colado" },
      });

      await salvarAvaliacao({ ...base, rating: 5, review: "texto novo e diferente" });

      expect(await contarSocial(id)).toEqual({ curtidas: 0, comentarios: 0 });
    });
  });

  it("o CHECK do banco recusa nota fora da meia estrela", async function ()
  {
    const usuario = await semearUsuario("rankine");
    const media = await salvarMediaDoAniList(OBRA, new Date());

    await expect(
      salvarAvaliacao({
        userId: usuario.id,
        mediaId: media.id,
        rating: 3.7,
        review: null,
        containsSpoilers: false,
      }),
    ).rejects.toThrowError();
  });
});

describe("privacidade da avaliação", function ()
{
  it("avaliação de um usuário não aparece para outro", async function ()
  {
    const dono = await semearUsuario("dono");
    const outro = await semearUsuario("outro");
    const media = await salvarMediaDoAniList(OBRA, new Date());

    await salvarAvaliacao({
      userId: dono.id,
      mediaId: media.id,
      rating: 4,
      review: null,
      containsSpoilers: false,
    });

    await expect(listarAvaliacoes(outro.id)).resolves.toEqual([]);
  });

  it("remover avaliação alheia não encontra nada e não apaga", async function ()
  {
    const dono = await semearUsuario("dono");
    const intruso = await semearUsuario("intruso");
    const media = await salvarMediaDoAniList(OBRA, new Date());

    await salvarAvaliacao({
      userId: dono.id,
      mediaId: media.id,
      rating: 4,
      review: null,
      containsSpoilers: false,
    });

    await expect(removerAvaliacao(intruso.id, media.id)).resolves.toBeNull();
    await expect(listarAvaliacoes(dono.id)).resolves.toHaveLength(1);

    await expect(removerAvaliacao(dono.id, media.id)).resolves.toEqual({
      removida: true,
    });
    await expect(listarAvaliacoes(dono.id)).resolves.toEqual([]);
  });
});
