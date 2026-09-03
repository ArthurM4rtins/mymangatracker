import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { interpretarFiltroDasAvaliadas } from "@/server/domain/perfil";
import { perfilDoUsuarioDoSistema } from "@/server/services/perfil.service";
import { usuarioDaSessao } from "../../../api/v1/_shared/sessao";
import { FiltrosAvaliadas } from "./filtros-avaliadas";
import { GradeAvaliadas } from "./grade-avaliadas";
import { MinhaEstante } from "./minha-estante";
import { ResenhaDoPerfil } from "./resenha";

// Perfil vem do banco e da sessão: nada pré-renderizável.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ ordem?: string; nota?: string }>;
};

const FORMATO_MES = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const FORMATO_DIA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export async function generateMetadata({ params }: Props)
{
  return { title: decodeURIComponent((await params).username) };
}

export default async function PaginaDoPerfil({ params, searchParams }: Props)
{
  const username = decodeURIComponent((await params).username);
  const filtro = interpretarFiltroDasAvaliadas(await searchParams);
  const viewerId = await usuarioDaSessao();

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
          O perfil depende do banco de dados, que não respondeu agora.
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
        <div
          aria-hidden
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-borda bg-superficie font-marca text-3xl font-bold text-acento"
        >
          {perfil.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-2 font-marca text-3xl font-bold tracking-tight">
            {perfil.username}
            {perfil.souEu && (
              <span className="rounded-full border border-borda px-2 py-0.5 text-xs font-normal text-texto-suave">
                você
              </span>
            )}
          </h1>
          <p className="text-sm text-texto-suave">
            no Kidoku desde {FORMATO_MES.format(perfil.membroDesde)}
          </p>
          <p className="flex flex-wrap gap-x-3 text-sm text-texto-suave">
            <Numero valor={perfil.numeros.avaliadas} um="avaliada" varios="avaliadas" />
            <Numero valor={perfil.numeros.resenhas} um="resenha" varios="resenhas" />
            <Numero valor={perfil.numeros.listas} um="lista" varios="listas" />
            <Numero
              valor={perfil.numeros.curtidasDadas}
              um="curtida dada"
              varios="curtidas dadas"
            />
          </p>
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
              anilistId: entrada.obra.anilistId,
              titulo: entrada.obra.titleEnglish ?? entrada.obra.titleRomaji,
              coverImageUrl: entrada.obra.coverImageUrl,
            };
          })}
        />
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
            Avaliadas
          </h2>
          {perfil.numeros.avaliadas > 0 && <FiltrosAvaliadas />}
        </div>
        {perfil.avaliadas.length === 0 ? (
          <p className="text-sm text-texto-suave">
            {temFiltro
              ? "Nenhuma obra com esse filtro."
              : perfil.souEu
                ? "Você ainda não deu nota. Avalie uma obra e ela aparece aqui."
                : `${perfil.username} ainda não deu nota a nenhuma obra.`}
          </p>
        ) : (
          <GradeAvaliadas
            avaliadas={perfil.avaliadas.map(function (obra)
            {
              return {
                anilistId: obra.anilistId,
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
          Resenhas recentes
        </h2>
        {perfil.resenhasRecentes.length === 0 ? (
          <p className="text-sm text-texto-suave">
            {perfil.souEu
              ? "Você ainda não escreveu resenha. Avalie uma obra com texto e ela aparece aqui."
              : `${perfil.username} ainda não escreveu resenha.`}
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
                    anilistId: resenha.anilistId,
                    titulo: resenha.titleEnglish ?? resenha.titleRomaji,
                    coverImageUrl: resenha.coverImageUrl,
                    rating: resenha.rating,
                    review: resenha.review,
                    containsSpoilers: resenha.containsSpoilers,
                    publicadaEm: FORMATO_DIA.format(resenha.publicadaEm),
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
          Listas
        </h2>
        {perfil.listas.length === 0 ? (
          <p className="text-sm text-texto-suave">
            {perfil.souEu ? (
              <>
                Você ainda não criou lista.{" "}
                <Link href="/listas" className="text-acento underline underline-offset-4">
                  Criar a primeira
                </Link>
              </>
            ) : (
              `${perfil.username} ainda não criou lista.`
            )}
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
                        {lista.totalDeObras} {lista.totalDeObras === 1 ? "obra" : "obras"}
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

function Numero({ valor, um, varios }: { valor: number; um: string; varios: string })
{
  return (
    <span>
      <span className="font-marca font-bold text-texto">{valor}</span>{" "}
      {valor === 1 ? um : varios}
    </span>
  );
}
