import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STATUS_DA_ESTANTE, type StatusDaEstante } from "@/server/domain/perfil";
import { perfilPublicoDoSistema } from "@/server/services/perfil.service";
import { usuarioDaSessao } from "../../../api/v1/_shared/sessao";
import { perfilDoUsuarioDoSistema } from "@/server/services/usuario.service";
import { ResenhaDoPerfil } from "./resenha";

// Perfil vem do banco e muda a cada leitura: nada pré-renderizável.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ username: string }>;
};

const ROTULO_DO_STATUS: Record<StatusDaEstante, string> = {
  READING: "Lendo",
  COMPLETED: "Concluído",
  PLANNED: "Planejado",
  PAUSED: "Pausado",
  DROPPED: "Largado",
};

const FORMATO_MES = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const FORMATO_DIA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export async function generateMetadata({ params }: Props)
{
  return { title: decodeURIComponent((await params).username) };
}

export default async function PaginaDoPerfil({ params }: Props)
{
  const username = decodeURIComponent((await params).username);
  const userId = await usuarioDaSessao();

  let perfil;
  try
  {
    perfil = await perfilPublicoDoSistema(username);
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

  const souEu = userId !== null && (await ehMeuPerfil(userId, perfil.username));

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
            {souEu && (
              <span className="rounded-full border border-borda px-2 py-0.5 text-xs font-normal text-texto-suave">
                você
              </span>
            )}
          </h1>
          <p className="text-sm text-texto-suave">
            no Kidoku desde {FORMATO_MES.format(perfil.membroDesde)}
          </p>
          {souEu && (
            <Link
              href="/estante"
              className="text-sm text-acento underline underline-offset-4"
            >
              Ir para a minha estante
            </Link>
          )}
        </div>
      </header>

      <section aria-label="Números" className="flex flex-col gap-3">
        <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <Numero rotulo="Na estante" valor={perfil.totalNaEstante} destaque />
          <Numero rotulo="Avaliações" valor={perfil.avaliacoes} destaque />
          <Numero rotulo="Listas" valor={perfil.listas.length} destaque />
        </dl>
        <dl className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {STATUS_DA_ESTANTE.map(function (status)
          {
            return (
              <Numero
                key={status}
                rotulo={ROTULO_DO_STATUS[status]}
                valor={perfil.estante[status]}
              />
            );
          })}
        </dl>
        <p className="text-xs text-texto-suave">
          Progresso de leitura e fontes são privados — só contagens aparecem aqui.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
          Resenhas recentes
        </h2>
        {perfil.resenhasRecentes.length === 0 ? (
          <p className="text-sm text-texto-suave">
            {souEu
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
            {souEu ? (
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

function Numero({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
})
{
  return (
    <div className="flex flex-col rounded-lg border border-borda bg-superficie px-3 py-2">
      <dt className="text-xs text-texto-suave">{rotulo}</dt>
      <dd className={`font-marca font-bold ${destaque ? "text-2xl" : "text-lg"}`}>
        {valor}
      </dd>
    </div>
  );
}

/** O perfil aberto é o de quem está logado? Banco fora = não. */
async function ehMeuPerfil(userId: string, username: string): Promise<boolean>
{
  try
  {
    const eu = await perfilDoUsuarioDoSistema(userId);

    return eu !== null && eu.username === username;
  }
  catch
  {
    return false;
  }
}
