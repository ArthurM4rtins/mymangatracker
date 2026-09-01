import Image from "next/image";
import Link from "next/link";
import { verificarSaudeDoSistema } from "@/server/services/sistema.service";
import { buscarNoCatalogo } from "@/server/services/catalogo.service";
import {
  listarEstanteDoSistema,
  type EntradaDaEstante,
} from "@/server/services/estante.service";
import { perfilDoUsuarioDoSistema } from "@/server/services/usuario.service";
import type { Dependencia, EstadoGeral } from "@/server/domain/health-status";
import type { MediaDoAniList } from "@/server/domain/anilist-media";
import { usuarioDaSessao } from "../api/v1/_shared/sessao";
import { ContinuarLeitura } from "./estante/continuar-leitura";

// Mede o agora e depende da sessão: nunca pré-renderizada, nunca de cache.
export const dynamic = "force-dynamic";

const LIMITE_CONTINUAR = 4;
const LIMITE_POPULARES = 12;

const RESUMO: Record<EstadoGeral, string> = {
  ok: "tudo no ar",
  degraded: "no ar, com configuração pendente",
  down: "alguma dependência está fora",
};

const ROTULO_DEPENDENCIA: Record<string, string> = {
  database: "banco de dados",
  anilist: "catálogo AniList",
};

const ESTADO_DEPENDENCIA: Record<Dependencia["status"], string> = {
  ok: "respondendo",
  down: "fora do ar",
  not_configured: "não configurado",
};

export default async function Home()
{
  const userId = await usuarioDaSessao();

  const [saude, populares, leitura] = await Promise.all([
    verificarSaudeDoSistema(),
    buscarNoCatalogo(""),
    userId ? dadosDeLeitura(userId) : Promise.resolve(null),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 px-6 py-12">
      {saude.status !== "ok" && (
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          {RESUMO[saude.status]} —{" "}
          {saude.dependencies
            .filter(function (dependencia) { return dependencia.status !== "ok"; })
            .map(function (dependencia)
            {
              return `${ROTULO_DEPENDENCIA[dependencia.name] ?? dependencia.name} ${ESTADO_DEPENDENCIA[dependencia.status]}`;
            })
            .join(", ")}
          . O que não depende disso continua funcionando.
        </p>
      )}

      {leitura ? (
        <BoasVindas leitura={leitura} />
      ) : (
        <Apresentacao />
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
            Populares agora
          </h2>
          <Link
            href="/catalogo"
            className="text-sm text-acento underline underline-offset-4"
          >
            ver catálogo →
          </Link>
        </div>

        {(populares.estado === "ok" || populares.estado === "destaques") ? (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {populares.obras.slice(0, LIMITE_POPULARES).map(function (obra)
            {
              return <CapaPopular key={obra.anilistId} obra={obra} />;
            })}
          </ul>
        ) : (
          <p className="text-sm text-texto-suave">
            O catálogo não respondeu agora — tente de novo em instantes.
          </p>
        )}
      </section>

      <footer className="mt-auto border-t border-borda pt-4 text-xs text-texto-suave">
        <p>
          <span aria-hidden>{saude.status === "ok" ? "●" : "○"}</span>{" "}
          {RESUMO[saude.status]} · verificado em {saude.checkedAt} ·{" "}
          <Link href="/api/v1/health" className="underline underline-offset-4">
            /api/v1/health
          </Link>
        </p>
      </footer>
    </main>
  );
}

type DadosDeLeitura = {
  username: string;
  continuar: EntradaDaEstante[];
  temEstante: boolean;
};

/** O que a home de quem está logado precisa. Banco fora = home de visitante. */
async function dadosDeLeitura(userId: string): Promise<DadosDeLeitura | null>
{
  try
  {
    const [perfil, lendo] = await Promise.all([
      perfilDoUsuarioDoSistema(userId),
      listarEstanteDoSistema({ userId, status: "READING" }),
    ]);

    if (perfil === null)
    {
      return null;
    }

    return {
      username: perfil.username,
      continuar: lendo
        .filter(function (entrada) { return entrada.fonte !== null; })
        .slice(0, LIMITE_CONTINUAR),
      temEstante: lendo.length > 0,
    };
  }
  catch
  {
    return null;
  }
}

function BoasVindas({ leitura }: { leitura: DadosDeLeitura })
{
  return (
    <section className="flex flex-col gap-5">
      <h1 className="font-marca text-3xl font-bold tracking-tight">
        Boa leitura, {leitura.username}.
      </h1>

      {leitura.continuar.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
            Continuar lendo
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {leitura.continuar.map(function (entrada)
            {
              return <CardContinuar key={entrada.entradaId} entrada={entrada} />;
            })}
          </ul>
        </div>
      ) : (
        <p className="text-texto-suave">
          {leitura.temEstante ? (
            <>
              Configure a fonte de leitura na{" "}
              <Link href="/estante" className="text-acento underline underline-offset-4">
                estante
              </Link>{" "}
              e o botão de continuar aparece aqui.
            </>
          ) : (
            <>
              Sua estante está vazia —{" "}
              <Link href="/catalogo" className="text-acento underline underline-offset-4">
                busque no catálogo
              </Link>{" "}
              e adicione a primeira obra.
            </>
          )}
        </p>
      )}
    </section>
  );
}

function Apresentacao()
{
  return (
    <section className="flex flex-col gap-5">
      <h1 className="font-marca text-4xl font-bold tracking-tight">Kidoku</h1>
      <p className="max-w-xl text-lg text-texto-suave">
        Registre sua leitura de mangá, manhwa e novel. Progresso automático,
        histórico privado, estante sua.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/cadastrar"
          className="rounded-md bg-acento px-4 py-2 text-sm font-medium text-acento-contraste"
        >
          Criar conta
        </Link>
        <Link
          href="/entrar"
          className="rounded-md border border-borda px-4 py-2 text-sm text-texto transition-colors hover:border-acento"
        >
          Entrar
        </Link>
      </div>
    </section>
  );
}

function CardContinuar({ entrada }: { entrada: EntradaDaEstante })
{
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-borda bg-superficie p-3">
      {entrada.obra.coverImageUrl ? (
        <Image
          src={entrada.obra.coverImageUrl}
          alt=""
          width={184}
          height={276}
          className="aspect-[2/3] w-full rounded object-cover"
          unoptimized
        />
      ) : (
        <div
          aria-hidden
          className="flex aspect-[2/3] w-full items-center justify-center rounded bg-fundo text-texto-suave"
        >
          —
        </div>
      )}

      <p className="line-clamp-1 text-sm font-medium">
        {entrada.obra.titleEnglish ?? entrada.obra.titleRomaji}
      </p>

      <ContinuarLeitura
        entradaId={entrada.entradaId}
        proximoCapitulo={entrada.proximoCapitulo}
        tipoDaFonte={entrada.fonte?.tipo}
        urlDaObra={entrada.fonte?.tipo === "pagina" ? entrada.fonte.urlDaObra : undefined}
        compacto
      />
    </li>
  );
}

function CapaPopular({ obra }: { obra: MediaDoAniList })
{
  const titulo = obra.titleEnglish ?? obra.titleRomaji;

  return (
    <li>
      <Link
        href={`/catalogo?q=${encodeURIComponent(titulo)}`}
        className="group flex flex-col gap-1.5"
      >
        {obra.coverImageUrl ? (
          <Image
            src={obra.coverImageUrl}
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
          {titulo}
        </span>
      </Link>
    </li>
  );
}
