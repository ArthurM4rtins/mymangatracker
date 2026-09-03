import Image from "next/image";
import Link from "next/link";
import { listasPublicasDoSistema } from "@/server/services/lista.service";
import { usuarioDaSessao } from "../../api/v1/_shared/sessao";
import { CriarLista } from "./criar-lista";

// Listas vêm do banco e mudam a toda hora: nada pré-renderizável.
export const dynamic = "force-dynamic";

export const metadata = { title: "Listas" };

export default async function Listas()
{
  const userId = await usuarioDaSessao();

  let listas;
  try
  {
    listas = await listasPublicasDoSistema();
  }
  catch
  {
    listas = null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">Listas</h1>
        <p className="text-texto-suave">
          Coleções feitas pelos leitores — dos clássicos às brincadeiras.
        </p>
      </header>

      {userId ? (
        <CriarLista />
      ) : (
        <p className="text-sm text-texto-suave">
          <Link href="/entrar" className="text-acento underline underline-offset-4">
            Entre
          </Link>{" "}
          para criar a sua.
        </p>
      )}

      {listas === null && (
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          As listas dependem do banco de dados, que não respondeu agora.
        </p>
      )}

      {listas !== null && listas.length === 0 && (
        <p className="text-sm text-texto-suave">
          Nenhuma lista ainda — seja a primeira pessoa a criar uma.
        </p>
      )}

      {listas !== null && listas.length > 0 && (
        <ul className="flex flex-col gap-4">
          {listas.map(function (lista)
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
                    <h2 className="font-medium group-hover:text-acento">{lista.nome}</h2>
                    <p className="text-xs text-texto-suave">
                      por {lista.username} · {lista.totalDeObras}{" "}
                      {lista.totalDeObras === 1 ? "obra" : "obras"}
                      {lista.curtidas > 0 && (
                        <>
                          {" "}· <span aria-hidden>♥</span> {lista.curtidas}
                          <span className="sr-only">
                            {lista.curtidas === 1 ? "curtida" : "curtidas"}
                          </span>
                        </>
                      )}
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
    </main>
  );
}
