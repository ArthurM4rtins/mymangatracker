import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  listarEstanteDoSistema,
  type EntradaDaEstante,
  type StatusDaEstante,
} from "@/server/services/estante.service";
import { usuarioDaSessao } from "../../api/v1/_shared/sessao";
import { Avaliar } from "./avaliar";
import { ConfigurarFonte } from "./configurar-fonte";
import { ContinuarLeitura } from "./continuar-leitura";
import { EditarProgresso } from "./editar-progresso";
import { SeletorStatus } from "./seletor-status";

// Estante é da sessão e do banco: nada aqui é pré-renderizável.
export const dynamic = "force-dynamic";

export const metadata = { title: "Estante" };

const PAIS: Record<string, string> = {
  JP: "Mangá",
  KR: "Manhwa",
  CN: "Manhua",
};

const ABAS: { valor?: StatusDaEstante; rotulo: string }[] = [
  { rotulo: "Tudo" },
  { valor: "READING", rotulo: "Lendo" },
  { valor: "COMPLETED", rotulo: "Concluído" },
  { valor: "PLANNED", rotulo: "Planejado" },
  { valor: "PAUSED", rotulo: "Pausado" },
  { valor: "DROPPED", rotulo: "Largado" },
];

const STATUS_VALIDOS = new Set(ABAS.map(function (aba) { return aba.valor; }));

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function Estante({ searchParams }: Props)
{
  const userId = await usuarioDaSessao();

  if (!userId)
  {
    redirect("/entrar");
  }

  const { status } = await searchParams;
  const filtro = STATUS_VALIDOS.has(status as StatusDaEstante)
    ? (status as StatusDaEstante)
    : undefined;

  let entradas: EntradaDaEstante[] | null;
  try
  {
    entradas = await listarEstanteDoSistema({ userId, status: filtro });
  }
  catch
  {
    // Banco fora ou não configurado: a página degrada com aviso, não estoura.
    entradas = null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">Estante</h1>
        <p className="text-texto-suave">
          Suas obras, por status. O progresso de leitura fica só com você.
        </p>
      </header>

      <nav aria-label="Filtrar por status" className="flex flex-wrap gap-2">
        {ABAS.map(function (aba)
        {
          const ativa = aba.valor === filtro;

          return (
            <Link
              key={aba.rotulo}
              href={aba.valor ? `/estante?status=${aba.valor}` : "/estante"}
              aria-current={ativa ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                ativa
                  ? "border-acento bg-acento text-acento-contraste"
                  : "border-borda text-texto-suave hover:text-texto"
              }`}
            >
              {aba.rotulo}
            </Link>
          );
        })}
      </nav>

      {entradas === null && (
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          A estante depende do banco de dados, que não respondeu agora. Tente de
          novo em instantes.
        </p>
      )}

      {entradas !== null && entradas.length === 0 && (
        <p className="text-sm text-texto-suave">
          Nada por aqui ainda.{" "}
          <Link href="/catalogo" className="text-acento underline underline-offset-4">
            Busque no catálogo
          </Link>{" "}
          e adicione a primeira obra.
        </p>
      )}

      {entradas !== null && entradas.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {entradas.map(function (entrada)
          {
            return <Entrada key={entrada.entradaId} entrada={entrada} />;
          })}
        </ul>
      )}
    </main>
  );
}

function Entrada({ entrada }: { entrada: EntradaDaEstante })
{
  const { obra } = entrada;
  const rotulo = obra.countryOfOrigin ? PAIS[obra.countryOfOrigin] : "Obra";

  return (
    <li className="flex gap-4 rounded-lg border border-borda bg-superficie p-4">
      <Link href={`/obra/${obra.anilistId}`} className="shrink-0">
        {obra.coverImageUrl ? (
          <Image
            src={obra.coverImageUrl}
            alt=""
            width={96}
            height={144}
            className="h-36 w-24 rounded object-cover transition-opacity hover:opacity-80"
            unoptimized
          />
        ) : (
          <div
            aria-hidden
            className="flex h-36 w-24 items-center justify-center rounded bg-fundo text-texto-suave"
          >
            —
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="font-medium leading-snug">
          <Link href={`/obra/${obra.anilistId}`} className="hover:text-acento">
            {obra.titleEnglish ?? obra.titleRomaji}
          </Link>
        </h2>

        <p className="flex flex-wrap items-center gap-1.5 text-xs text-texto-suave">
          <span className="rounded-full border border-borda px-2 py-0.5">
            {obra.type === "NOVEL" ? "Novel" : rotulo}
          </span>
          {obra.chapters !== null && (
            <span className="tabular-nums">{obra.chapters} capítulos</span>
          )}
          <EditarProgresso
            entradaId={entrada.entradaId}
            progressChapter={entrada.progressChapter}
          />
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {entrada.fonte && (
            <ContinuarLeitura
              entradaId={entrada.entradaId}
              proximoCapitulo={entrada.proximoCapitulo}
              tipoDaFonte={entrada.fonte.tipo}
              urlDaObra={entrada.fonte.tipo === "pagina" ? entrada.fonte.urlDaObra : undefined}
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <SeletorStatus entradaId={entrada.entradaId} status={entrada.status} />
            <ConfigurarFonte
              entradaId={entrada.entradaId}
              temFonte={entrada.fonte !== null}
            />
          </div>

          {entrada.fonte && (
            <p className="text-xs text-texto-suave">lendo em {entrada.fonte.sourceHost}</p>
          )}

          <Avaliar entradaId={entrada.entradaId} avaliacao={entrada.avaliacao} />
        </div>
      </div>
    </li>
  );
}
