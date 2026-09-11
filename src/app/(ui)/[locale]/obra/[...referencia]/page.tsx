import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { alternativasDeIdioma, Link } from "@/i18n/navigation";
import {
  obraParaPaginaDoSistema,
  type MinhaRelacao,
  type ObraSimilar,
} from "@/server/services/obra.service";
import { interpretarDescricao } from "@/server/domain/descricao";
import { AdicionarALista } from "./adicionar-a-lista";
import { AvaliacaoDaObra } from "./avaliacao-da-obra";
import { NotaFolunio } from "./nota-folunio";
import { FichaEditorial, GenerosDaObra, ObrasRelacionadas } from "./ficha-editorial";
import { ReviewSocial } from "./review-social";
import { usuarioDaSessao } from "../../../../api/v1/_shared/sessao";
import { BotaoEstante } from "../../catalogo/botao-estante";
import { DataHora } from "../../componentes/data-hora";
import { ColecaoVisual } from "../../componentes/colecao-visual";
import { CartaoObra } from "../../componentes/cartao-obra";
import { ContinuarLeitura } from "../../estante/continuar-leitura";
import { EditarProgresso } from "../../estante/editar-progresso";
import { SeletorStatus } from "../../estante/seletor-status";
import { idiomaDoSegmento } from "@/i18n/routing";
import { caminhoDaObra, interpretarReferencia } from "@/server/domain/referencia-da-obra";
import { caminhoDoAutor } from "@/server/domain/referencia-de-autor";

// Sessão + AniList: nada aqui é pré-renderizável.
export const dynamic = "force-dynamic";

// generateMetadata e a página rodam no mesmo request, em paralelo. Sem
// memoizar, o caso de uso inteiro (AniList, upsert, similares) rodava duas
// vezes por visita (#65, item 3). Mesmos argumentos = uma execução.
const carregarObra = cache(obraParaPaginaDoSistema);

/** País de origem → a chave do rótulo do formato em `comum.formato`. */
const PAIS: Record<string, "formato.JP" | "formato.KR" | "formato.CN"> = {
  JP: "formato.JP",
  KR: "formato.KR",
  CN: "formato.CN",
};

type Props = {
  params: Promise<{ referencia: string[] }>;
};

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/obra/[...referencia]">): Promise<Metadata>
{
  const { locale, referencia } = await params;
  const alvo = interpretarReferencia(referencia[0] ?? "", referencia[1]);
  const t = await getTranslations({ locale: idiomaDoSegmento(locale), namespace: "obra" });
  if (alvo === null)
  {
    return { title: t("meta.titulo"), alternates: alternativasDeIdioma("/catalogo") };
  }

  const userId = await usuarioDaSessao();
  const resultado = await carregarObra(alvo, userId);

  return {
    title:
      resultado.estado === "ok"
        ? resultado.obra.titleEnglish ?? resultado.obra.titleRomaji
        : t("meta.titulo"),
    alternates: alternativasDeIdioma(alvo === null ? "/catalogo" : caminhoDaObra(alvo)),
  };
}

export default async function PaginaDaObra({ params }: Props)
{
  const { referencia } = await params;
  const alvo = interpretarReferencia(referencia[0] ?? "", referencia[1]);

  if (alvo === null)
  {
    notFound();
  }

  const userId = await usuarioDaSessao();
  const resultado = await carregarObra(alvo, userId);
  const t = await getTranslations("obra");
  const c = await getTranslations("comum");
  const f = await getTranslations("ficha");

  if (resultado.estado === "nao_encontrada")
  {
    notFound();
  }

  if (resultado.estado === "indisponivel")
  {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          {t("indisponivel")}
        </p>
      </main>
    );
  }

  const { obra, similares, minha, minhaAvaliacao, reviews, notaDoFolunio } = resultado;
  // O que a minha resenha já recebeu: apagar o texto leva isso junto (#112),
  // então a tela pede confirmação antes.
  const minhaReview = reviews.find(function (review) { return review.minha; });
  const socialDaMinha =
    minhaReview === undefined
      ? null
      : { curtidas: minhaReview.curtidas, comentarios: minhaReview.comentarios.length };
  // Obra sem banner usa a própria capa esticada com blur — todas consistentes.
  const fundo = obra.bannerImageUrl ?? obra.coverImageUrl;
  const descricao =
    obra.description === null ? null : interpretarDescricao(obra.description);
  // Novel vem do tipo; o resto sai do país de origem. País que não conhecemos
  // continua caindo no rótulo genérico.
  const chaveDoFormato =
    obra.type === "NOVEL"
      ? "formato.NOVEL"
      : obra.countryOfOrigin
        ? PAIS[obra.countryOfOrigin]
        : undefined;

  return (
    <main className="flex min-h-screen flex-col">
      {fundo && (
        <div className="relative h-44 w-full overflow-hidden sm:h-64">
          <Image
            src={fundo}
            alt=""
            fill
            className={`object-cover opacity-50 ${obra.bannerImageUrl ? "" : "scale-110 blur-xl"}`}
            unoptimized
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-fundo" />
        </div>
      )}

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-10">
        <section className="flex flex-col gap-6 sm:flex-row">
          {obra.coverImageUrl ? (
            <Image
              src={obra.coverImageUrl}
              alt=""
              width={192}
              height={288}
              className="h-72 w-48 shrink-0 rounded-lg object-cover shadow-lg"
              unoptimized
              priority
            />
          ) : (
            <div
              aria-hidden
              className="flex h-72 w-48 shrink-0 items-center justify-center rounded-lg bg-superficie text-texto-suave"
            >
              —
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-marca text-3xl font-bold tracking-tight">
                {obra.titleEnglish ?? obra.titleRomaji}
              </h1>
              {obra.startYear !== null && (
                <span className="text-lg text-texto-suave">{obra.startYear}</span>
              )}
            </div>

            {obra.autores.length > 0 && (
              <p className="text-sm text-texto-suave">
                {t("autoria")}{" "}
                {obra.autores.map(function (autor, indice)
                {
                  const caminho = caminhoDoAutor(autor);
                  return (
                    <span key={autor.anilistStaffId ? `anilist:${autor.anilistStaffId}` : `kitsu:${autor.kitsuPersonId}`}>
                      {indice > 0 && ", "}
                      {caminho ? <Link
                        href={caminho}
                        className="text-texto underline decoration-dotted underline-offset-4 hover:text-acento"
                      >
                        {autor.nome}
                      </Link> : <span className="text-texto">{autor.nome}</span>}
                      {/story|art|author/i.test(autor.papel) && <span className="text-xs">{" "}·{" "}{/story/i.test(autor.papel) && /art/i.test(autor.papel) ? f("storyArt") : /story|author/i.test(autor.papel) ? f("story") : f("art")}</span>}
                    </span>
                  );
                })}
              </p>
            )}

            <p className="flex flex-wrap items-center gap-1.5 text-xs text-texto-suave">
              <span className="rounded-full border border-borda px-2 py-0.5">
                {obra.details?.subtype === "oneshot" ? f("oneshot") : obra.details?.subtype === "doujin" ? f("doujin") : obra.details?.subtype === "oel" ? f("oel") : obra.details?.subtype === "manga" ? c("formato.JP") : chaveDoFormato === undefined
                  ? t("formatoDesconhecido")
                  : c(chaveDoFormato)}
              </span>
              <GenerosDaObra generos={obra.genres} />
              {/* Zero capítulos não existe: é linha cacheada de quando
                  `chapterCount` nulo do Kitsu virava 0 (#254). */}
              {obra.chapters !== null && obra.chapters > 0 && (
                <span className="tabular-nums">
                  {f("capitulos", { n: obra.chapters })}
                </span>
              )}
            </p>

            {descricao && descricao.sinopse !== "" && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-texto-suave">
                {descricao.sinopse}
              </p>
            )}
          </div>

          {(userId !== null || notaDoFolunio !== null) && (
            <div className="flex shrink-0 flex-col gap-4 sm:w-64">
              {userId !== null && (
                <AvaliacaoDaObra
                  chave={obra.chave}
                  titulo={obra.titleEnglish ?? obra.titleRomaji}
                  ano={obra.startYear}
                  coverImageUrl={obra.coverImageUrl}
                  avaliacao={minhaAvaliacao}
                  social={socialDaMinha}
                />
              )}
              {/* A média fica embaixo de onde a pessoa avalia (issue #81). */}
              {notaDoFolunio !== null && <NotaFolunio nota={notaDoFolunio} />}
            </div>
          )}
        </section>

        {descricao && descricao.notas.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
                {t("curiosidades")}
              </h2>
              <span className="text-xs tabular-nums text-texto-suave">
                {descricao.notas.length}
              </span>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {descricao.notas.map(function (nota, indice)
              {
                return (
                  <li
                    key={nota}
                    className="group relative flex gap-4 overflow-hidden rounded-xl border border-borda bg-superficie p-4 transition-colors hover:border-acento/60"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-3 -top-4 select-none font-marca text-6xl font-black leading-none text-acento/10 transition-colors group-hover:text-acento/20"
                    >
                      {String(indice + 1).padStart(2, "0")}
                    </span>
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-acento/15 text-xs font-semibold tabular-nums text-acento"
                    >
                      {indice + 1}
                    </span>
                    <p className="relative min-w-0 flex-1 text-sm leading-relaxed text-texto">
                      {nota}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <FichaEditorial detalhes={obra.details} />
        <PainelDoUsuario chave={obra.chave} minha={minha} logado={userId !== null} />
        <ObrasRelacionadas detalhes={obra.details} />

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
            {t("resenhas.titulo")}
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-texto-suave">
              {t("resenhas.vazio")}
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {reviews.map(function (review)
              {
                return (
                  <ReviewSocial
                    key={review.entryId}
                    review={{
                      entryId: review.entryId,
                      username: review.username,
                      avatarVersao: review.avatarVersao,
                      minha: review.minha,
                      rating: review.rating,
                      review: review.review,
                      containsSpoilers: review.containsSpoilers,
                      curtidas: review.curtidas,
                      curtiPorMim: review.curtiPorMim,
                      comentarios: review.comentarios.map(function (comentario)
                      {
                        return {
                          id: comentario.id,
                          username: comentario.username,
                          avatarVersao: comentario.avatarVersao,
                          texto: comentario.texto,
                          criadoEm: comentario.criadoEm,
                          meu: comentario.meu,
                        };
                      }),
                      totalDeComentarios: review.totalDeComentarios,
                    }}
                    logado={userId !== null}
                  />
                );
              })}
            </ul>
          )}
        </section>

        {similares.length > 0 && <Similares similares={similares} />}
      </div>
    </main>
  );
}

async function PainelDoUsuario({
  chave,
  minha,
  logado,
}: {
  chave: string;
  minha: MinhaRelacao | null;
  logado: boolean;
})
{
  const t = await getTranslations("obra");

  if (!logado)
  {
    return (
      <section className="rounded-lg border border-borda bg-superficie p-4 text-sm text-texto-suave">
        {t.rich("painel.convite", {
          entrar: function (partes)
          {
            return (
              <Link href="/entrar" className="text-acento underline underline-offset-4">
                {partes}
              </Link>
            );
          },
        })}
      </section>
    );
  }

  if (minha === null)
  {
    return (
      <section className="flex flex-wrap items-center gap-4 rounded-lg border border-borda bg-superficie p-4">
        <BotaoEstante chave={chave} atualizarAoSalvar />
        {/* Lista é curadoria, não leitura (#237): dá para listar sem ter na estante. */}
        <AdicionarALista chave={chave} />
        <span className="text-sm text-texto-suave">
          {t("painel.adicionar")}
        </span>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-borda bg-superficie p-4">
      <div className="flex flex-wrap items-center gap-4">
        <SeletorStatus entradaId={minha.entradaId} status={minha.status} />
        <span className="text-xs text-texto-suave">
          <EditarProgresso
            entradaId={minha.entradaId}
            progressChapter={minha.progressChapter}
          />
        </span>
        <AdicionarALista chave={chave} />
      </div>

      <ContinuarLeitura continuarEm={minha.continuarEm} />

      {minha.historico.length > 0 && <HistoricoDeLeitura historico={minha.historico} />}
    </section>
  );
}

/** O histórico é do dono (issue #54): só renderiza dentro do painel de quem está logado. */
async function HistoricoDeLeitura({ historico }: { historico: MinhaRelacao["historico"] })
{
  const t = await getTranslations("obra");

  return (
    <details className="group text-sm">
      <summary className="cursor-pointer select-none text-xs uppercase tracking-wide text-texto-suave hover:text-texto">
        {t("historico.titulo")} ·{" "}
        {historico.length === 20
          ? t("historico.maisRecentes", { n: historico.length })
          : t("contagem.aberturas", { n: historico.length })}
      </summary>
      <ol className="mt-3 flex flex-col gap-1.5 border-l border-borda pl-3">
        {historico.map(function (abertura)
        {
          return (
            <li key={abertura.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="font-medium tabular-nums">
                {t("historico.capitulo", { n: abertura.chapter })}
              </span>
              {/* Fuso de quem lê, não do servidor (#65, item 7). */}
              <DataHora
                iso={abertura.abertaEm.toISOString()}
                className="text-xs text-texto-suave tabular-nums"
              />
              <a
                href={abertura.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-texto-suave underline decoration-dotted underline-offset-4 hover:text-acento"
              >
                {abertura.sourceHost ?? t("historico.fonteRemovida")}
              </a>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

async function Similares({ similares }: { similares: ObraSimilar[] })
{
  const t = await getTranslations("obra");

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
        {t("similares")}
      </h2>
      <ColecaoVisual titulo={t("similares")} andarSimples classeGrade="grid grid-cols-3 gap-3 sm:grid-cols-6"
        itens={similares.map((similar) => ({
          id: similar.chave,
          titulo: similar.titleEnglish ?? similar.titleRomaji,
          capa: similar.coverImageUrl,
          detalhe: <CartaoObra chave={similar.chave}
            titulo={similar.titleEnglish ?? similar.titleRomaji} capa={similar.coverImageUrl} />,
        }))}
      />
    </section>
  );
}
