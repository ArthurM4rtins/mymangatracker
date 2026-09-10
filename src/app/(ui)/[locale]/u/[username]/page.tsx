import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { interpretarFiltroDasAvaliadas } from "@/server/domain/perfil";
import { perfilDoUsuarioDoSistema } from "@/server/services/perfil.service";
import { Link, alternativasDeIdioma } from "@/i18n/navigation";
import { usuarioDaSessao } from "../../../../api/v1/_shared/sessao";
import { AcoesSociais } from "./acoes-sociais";
import { FiltrosAvaliadas } from "./filtros-avaliadas";
import { FotoDePerfil } from "./foto-de-perfil";
import { GradeAvaliadas } from "./grade-avaliadas";
import { MinhaEstante } from "./minha-estante";
import { ResenhaDoPerfil } from "./resenha";

// Perfil vem do banco e da sessão: nada pré-renderizável.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ ordem?: string; nota?: string }>;
};

/**
 * As duas datas do perfil, no idioma de quem está lendo. `Intl` nativo, e não o
 * `getFormatter()` do next-intl: sem `timeZone` explícito o nativo usa o fuso de
 * quem executa, que é o que esta tela sempre fez.
 */
function formatoDoMes(idioma: string): Intl.DateTimeFormat
{
  return new Intl.DateTimeFormat(idioma, { month: "long", year: "numeric" });
}

function formatoDoDia(idioma: string): Intl.DateTimeFormat
{
  return new Intl.DateTimeFormat(idioma, { dateStyle: "medium" });
}

/** O número em destaque da contagem: a marcação mora na mensagem, não no JSX. */
function destaque(conteudo: React.ReactNode)
{
  return <span className="font-marca font-bold text-texto">{conteudo}</span>;
}

/**
 * Argumentos de uma contagem em destaque: `n` só escolhe o ramo do plural e
 * `valor` é o que aparece. O `#` do ICU imprimiria o número pelo
 * Intl.NumberFormat do locale — "1.000 avaliadas" —, e a tela sempre mostrou o
 * número cru.
 */
function contagemEmDestaque(n: number)
{
  return { n, valor: String(n), forte: destaque };
}

export async function generateMetadata({ params }: Props)
{
  // O Next já entrega o parâmetro decodificado (#65, item 14).
  const { username } = await params;

  return {
    title: username,
    alternates: alternativasDeIdioma(`/u/${username}`),
  };
}

export default async function PaginaDoPerfil({ params, searchParams }: Props)
{
  const username = (await params).username;
  const filtro = interpretarFiltroDasAvaliadas(await searchParams);
  const viewerId = await usuarioDaSessao();
  const t = await getTranslations("perfil");
  const tConta = await getTranslations("conta");
  const idioma = await getLocale();

  let perfil;
  try
  {
    perfil = await perfilDoUsuarioDoSistema({ username, viewerId, filtro });
  }
  catch
  {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          {t("erros.semBanco")}
        </p>
      </main>
    );
  }

  if (perfil === null)
  {
    notFound();
  }

  const temFiltro = filtro.nota !== undefined || filtro.ordem !== "recentes";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-6 py-12">
      <header className="flex items-center gap-5">
        <FotoDePerfil
          username={perfil.username}
          versao={perfil.avatarVersao}
          souEu={perfil.souEu}
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-2 font-marca text-3xl font-bold tracking-tight">
            {perfil.username}
            {perfil.souEu && (
              <span className="rounded-full border border-borda px-2 py-0.5 text-xs font-normal text-texto-suave">
                {t("voce")}
              </span>
            )}
          </h1>
          <p className="text-sm text-texto-suave">
            {t("membroDesde", { mes: formatoDoMes(idioma).format(perfil.membroDesde) })}
          </p>
          <p className="flex flex-wrap gap-x-3 text-sm text-texto-suave">
            <span>
              {t.rich("numeros.avaliadas", contagemEmDestaque(perfil.numeros.avaliadas))}
            </span>
            <span>
              {t.rich("numeros.resenhas", contagemEmDestaque(perfil.numeros.resenhas))}
            </span>
            <span>
              {t.rich("numeros.listas", contagemEmDestaque(perfil.numeros.listas))}
            </span>
            <span>
              {t.rich("numeros.curtidasDadas", contagemEmDestaque(perfil.numeros.curtidasDadas))}
            </span>
            <span>
              {t.rich("numeros.seguindo", contagemEmDestaque(perfil.social.seguindo))}
            </span>
            {perfil.souEu && (
              <>
                <span>
                  {t.rich("numeros.seguidores", contagemEmDestaque(perfil.social.seguidores))}
                </span>
                <span>
                  {t.rich("numeros.curtidasNoPerfil", contagemEmDestaque(perfil.social.curtidas))}
                </span>
              </>
            )}
          </p>
          {perfil.souEu && (
            <p className="mt-1 text-sm">
              {/* O caminho para apagar a conta (#208) mora fora da tela pública. */}
              <Link href="/conta" className="underline underline-offset-4 text-texto-suave">
                {tConta("linkDoPerfil")}
              </Link>
            </p>
          )}
          {!perfil.souEu && (
            <div className="mt-1">
              <AcoesSociais
                username={perfil.username}
                seguidores={perfil.social.seguidores}
                sigo={perfil.social.sigo}
                curtidas={perfil.social.curtidas}
                curti={perfil.social.curti}
                logado={viewerId !== null}
              />
            </div>
          )}
        </div>
      </header>

      {perfil.estante !== null && (
        <MinhaEstante
          contagem={perfil.estante.contagem}
          entradas={perfil.estante.entradas.map(function (entrada)
          {
            return {
              entradaId: entrada.entradaId,
              status: entrada.status,
              progressChapter: entrada.progressChapter,
              chave: entrada.obra.chave,
              titulo: entrada.obra.titleEnglish ?? entrada.obra.titleRomaji,
              coverImageUrl: entrada.obra.coverImageUrl,
            };
          })}
        />
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
            {t("avaliadas.titulo")}
          </h2>
          {perfil.numeros.avaliadas > 0 && <FiltrosAvaliadas />}
        </div>
        {perfil.avaliadas.length === 0 ? (
          <p className="text-sm text-texto-suave">
            {temFiltro
              ? t("avaliadas.vaziaComFiltro")
              : perfil.souEu
                ? t("avaliadas.vaziaPropria")
                : t("avaliadas.vaziaOutro", { username: perfil.username })}
          </p>
        ) : (
          <GradeAvaliadas
            avaliadas={perfil.avaliadas.map(function (obra)
            {
              return {
                chave: obra.chave,
                titulo: obra.titleEnglish ?? obra.titleRomaji,
                coverImageUrl: obra.coverImageUrl,
                rating: obra.rating,
              };
            })}
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
          {t("resenhas.titulo")}
        </h2>
        {perfil.resenhasRecentes.length === 0 ? (
          <p className="text-sm text-texto-suave">
            {perfil.souEu
              ? t("resenhas.vaziaPropria")
              : t("resenhas.vaziaOutro", { username: perfil.username })}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {perfil.resenhasRecentes.map(function (resenha)
            {
              return (
                <ResenhaDoPerfil
                  key={resenha.entryId}
                  resenha={{
                    entryId: resenha.entryId,
                    chave: resenha.chave,
                    titulo: resenha.titleEnglish ?? resenha.titleRomaji,
                    coverImageUrl: resenha.coverImageUrl,
                    rating: resenha.rating,
                    review: resenha.review,
                    containsSpoilers: resenha.containsSpoilers,
                    publicadaEm: formatoDoDia(idioma).format(resenha.publicadaEm),
                    curtidas: resenha.curtidas,
                  }}
                />
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
          {t("listas.titulo")}
        </h2>
        {perfil.listas.length === 0 ? (
          <p className="text-sm text-texto-suave">
            {perfil.souEu
              ? t.rich("listas.vaziaPropria", {
                  link: function (conteudo)
                  {
                    return (
                      <Link href="/listas" className="text-acento underline underline-offset-4">
                        {conteudo}
                      </Link>
                    );
                  },
                })
              : t("listas.vaziaOutro", { username: perfil.username })}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {perfil.listas.map(function (lista)
            {
              return (
                <li key={lista.listaId}>
                  <Link
                    href={`/listas/${lista.listaId}`}
                    className="group flex gap-4 rounded-lg border border-borda bg-superficie p-4 transition-colors hover:border-acento/60"
                  >
                    <div className="flex shrink-0 -space-x-8">
                      {lista.capas.length === 0 ? (
                        <div
                          aria-hidden
                          className="flex h-24 w-16 items-center justify-center rounded bg-fundo text-texto-suave"
                        >
                          —
                        </div>
                      ) : (
                        lista.capas.map(function (capa, indice)
                        {
                          return capa ? (
                            <Image
                              key={indice}
                              src={capa}
                              alt=""
                              width={64}
                              height={96}
                              className="h-24 w-16 rounded border border-borda object-cover"
                              unoptimized
                            />
                          ) : (
                            <div
                              key={indice}
                              aria-hidden
                              className="h-24 w-16 rounded border border-borda bg-fundo"
                            />
                          );
                        })
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <h3 className="font-medium group-hover:text-acento">{lista.nome}</h3>
                      <p className="text-xs text-texto-suave">
                        {t("listas.obras", {
                          n: lista.totalDeObras,
                          valor: String(lista.totalDeObras),
                        })}
                      </p>
                      {lista.descricao && (
                        <p className="line-clamp-2 text-sm text-texto-suave">
                          {lista.descricao}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
