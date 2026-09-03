import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  obraParaPaginaDoSistema,
  type MinhaRelacao,
  type ObraSimilar,
} from "@/server/services/obra.service";
import { interpretarDescricao } from "@/server/domain/descricao";
import { AdicionarALista } from "./adicionar-a-lista";
import { AvaliacaoDaObra } from "./avaliacao-da-obra";
import { NotaKidoku } from "./nota-kidoku";
import { ReviewSocial } from "./review-social";
import { usuarioDaSessao } from "../../../api/v1/_shared/sessao";
import { BotaoEstante } from "../../catalogo/botao-estante";
import { ConfigurarFonte } from "../../estante/configurar-fonte";
import { ContinuarLeitura } from "../../estante/continuar-leitura";
import { EditarProgresso } from "../../estante/editar-progresso";
import { SeletorStatus } from "../../estante/seletor-status";

// Sessão + AniList: nada aqui é pré-renderizável.
export const dynamic = "force-dynamic";

const PAIS: Record<string, string> = {
  JP: "Mangá",
  KR: "Manhwa",
  CN: "Manhua",
};

type Props = {
  params: Promise<{ anilistId: string }>;
};

export async function generateMetadata({ params }: Props)
{
  const id = Number((await params).anilistId);

  if (!Number.isInteger(id) || id <= 0)
  {
    return { title: "Obra" };
  }

  // Segunda chamada barata: a página acabou de encher o cache.
  const resultado = await obraParaPaginaDoSistema(id, null);

  return {
    title:
      resultado.estado === "ok"
        ? resultado.obra.titleEnglish ?? resultado.obra.titleRomaji
        : "Obra",
  };
}

export default async function PaginaDaObra({ params }: Props)
{
  const id = Number((await params).anilistId);

  if (!Number.isInteger(id) || id <= 0)
  {
    notFound();
  }

  const userId = await usuarioDaSessao();
  const resultado = await obraParaPaginaDoSistema(id, userId);

  if (resultado.estado === "nao_encontrada")
  {
    notFound();
  }

  if (resultado.estado === "indisponivel")
  {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          O AniList não respondeu agora e esta obra ainda não está no nosso
          cache. Tente de novo em instantes.
        </p>
      </main>
    );
  }

  const { obra, similares, minha, minhaAvaliacao, reviews, notaDoKidoku } = resultado;
  // Obra sem banner usa a própria capa esticada com blur — todas consistentes.
  const fundo = obra.bannerImageUrl ?? obra.coverImageUrl;
  const descricao =
    obra.description === null ? null : interpretarDescricao(obra.description);

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
                por{" "}
                {obra.autores.map(function (autor, indice)
                {
                  return (
                    <span key={autor.anilistStaffId}>
                      {indice > 0 && ", "}
                      <Link
                        href={`/autor/${autor.anilistStaffId}`}
                        className="text-texto underline decoration-dotted underline-offset-4 hover:text-acento"
                      >
                        {autor.nome}
                      </Link>
                    </span>
                  );
                })}
              </p>
            )}

            <p className="flex flex-wrap items-center gap-1.5 text-xs text-texto-suave">
              <span className="rounded-full border border-borda px-2 py-0.5">
                {obra.type === "NOVEL"
                  ? "Novel"
                  : (obra.countryOfOrigin && PAIS[obra.countryOfOrigin]) ?? "Obra"}
              </span>
              {obra.genres.map(function (genero)
              {
                return (
                  <span key={genero} className="rounded-full border border-borda px-2 py-0.5">
                    {genero}
                  </span>
                );
              })}
              {obra.chapters !== null && (
                <span className="tabular-nums">{obra.chapters} capítulos</span>
              )}
            </p>

            {notaDoKidoku !== null && <NotaKidoku nota={notaDoKidoku} />}

            {descricao && descricao.sinopse !== "" && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-texto-suave">
                {descricao.sinopse}
              </p>
            )}
          </div>

          {userId !== null && (
            <div className="shrink-0 sm:w-64">
              <AvaliacaoDaObra
                anilistId={obra.anilistId}
                titulo={obra.titleEnglish ?? obra.titleRomaji}
                ano={obra.startYear}
                coverImageUrl={obra.coverImageUrl}
                avaliacao={minhaAvaliacao}
              />
            </div>
          )}
        </section>

        {descricao && descricao.notas.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
                Curiosidades
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

        <PainelDoUsuario anilistId={obra.anilistId} minha={minha} logado={userId !== null} />

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
            Resenhas
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-texto-suave">
              Ainda não tem resenha por aqui — avalie com um texto e a sua
              aparece para todo mundo.
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
                          texto: comentario.texto,
                          meu: comentario.meu,
                        };
                      }),
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

function PainelDoUsuario({
  anilistId,
  minha,
  logado,
}: {
  anilistId: number;
  minha: MinhaRelacao | null;
  logado: boolean;
})
{
  if (!logado)
  {
    return (
      <section className="rounded-lg border border-borda bg-superficie p-4 text-sm text-texto-suave">
        <Link href="/entrar" className="text-acento underline underline-offset-4">
          Entre
        </Link>{" "}
        para adicionar à estante, avaliar e registrar a leitura.
      </section>
    );
  }

  if (minha === null)
  {
    return (
      <section className="flex items-center gap-4 rounded-lg border border-borda bg-superficie p-4">
        <BotaoEstante anilistId={anilistId} atualizarAoSalvar />
        <span className="text-sm text-texto-suave">
          Adicione à estante para avaliar e registrar a leitura.
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
        <ConfigurarFonte entradaId={minha.entradaId} temFonte={minha.fonte !== null} />
        <AdicionarALista anilistId={anilistId} />
      </div>

      {minha.fonte && (
        <ContinuarLeitura
          entradaId={minha.entradaId}
          proximoCapitulo={minha.proximoCapitulo}
          tipoDaFonte={minha.fonte.tipo}
          urlDaObra={minha.fonte.tipo === "pagina" ? minha.fonte.urlDaObra : undefined}
        />
      )}

      {minha.historico.length > 0 && <HistoricoDeLeitura historico={minha.historico} />}
    </section>
  );
}

const FORMATO_ABERTURA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

/** O histórico é do dono (issue #54): só renderiza dentro do painel de quem está logado. */
function HistoricoDeLeitura({ historico }: { historico: MinhaRelacao["historico"] })
{
  return (
    <details className="group text-sm">
      <summary className="cursor-pointer select-none text-xs uppercase tracking-wide text-texto-suave hover:text-texto">
        Histórico de leitura · {historico.length}
        {historico.length === 20 ? " mais recentes" : historico.length === 1 ? " abertura" : " aberturas"}
      </summary>
      <ol className="mt-3 flex flex-col gap-1.5 border-l border-borda pl-3">
        {historico.map(function (abertura)
        {
          return (
            <li key={abertura.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="font-medium tabular-nums">cap. {abertura.chapter}</span>
              <time
                dateTime={abertura.abertaEm.toISOString()}
                className="text-xs text-texto-suave tabular-nums"
              >
                {FORMATO_ABERTURA.format(abertura.abertaEm)}
              </time>
              <a
                href={abertura.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-texto-suave underline decoration-dotted underline-offset-4 hover:text-acento"
              >
                {abertura.sourceHost ?? "fonte removida"}
              </a>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

function Similares({ similares }: { similares: ObraSimilar[] })
{
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
        Obras similares
      </h2>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {similares.map(function (similar)
        {
          return (
            <li key={similar.anilistId}>
              <Link
                href={`/obra/${similar.anilistId}`}
                className="group flex flex-col gap-1.5"
              >
                {similar.coverImageUrl ? (
                  <Image
                    src={similar.coverImageUrl}
                    alt=""
                    width={144}
                    height={216}
                    className="aspect-[2/3] w-full rounded object-cover transition-opacity group-hover:opacity-80"
                    unoptimized
                  />
                ) : (
                  <div
                    aria-hidden
                    className="flex aspect-[2/3] w-full items-center justify-center rounded bg-superficie text-texto-suave"
                  >
                    —
                  </div>
                )}
                <span className="line-clamp-1 text-xs text-texto-suave group-hover:text-texto">
                  {similar.titleEnglish ?? similar.titleRomaji}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
