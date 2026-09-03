import Image from "next/image";
import Link from "next/link";
import { verificarSaudeDoSistema } from "@/server/services/sistema.service";
import { buscarNoCatalogo } from "@/server/services/catalogo.service";
import { interpretarFiltros } from "@/server/domain/catalogo-filtros";
import {
  listarEstanteDoSistema,
  type EntradaDaEstante,
} from "@/server/services/estante.service";
import { perfilDoUsuarioDoSistema } from "@/server/services/usuario.service";
import {
  feedDaComunidadeDoSistema,
  type AtividadeDaComunidade,
} from "@/server/services/atividade.service";
import { FeedDaComunidade, type ItemParaTela } from "./feed-da-comunidade";
import {
  vitrineDaHomeDoSistema,
  type VitrineDaHome,
} from "@/server/services/vitrine.service";
import { Carrossel } from "./componentes/carrossel";
import { CardLista, CardResenha } from "./vitrine-cards";
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

  const [saude, populares, leitura, atividade, vitrine] = await Promise.all([
    verificarSaudeDoSistema(),
    buscarNoCatalogo(interpretarFiltros({})),
    userId ? dadosDeLeitura(userId) : Promise.resolve(null),
    feedDaComunidadeDoSistema(),
    vitrineDaHomeDoSistema(),
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

      <Carrossel
        titulo="Resenhas"
        itens={cardsDeResenhas(vitrine)}
        vazio="Ainda não tem resenha por aqui — a primeira aparece nesta vitrine."
      />

      <Carrossel
        titulo="Listas"
        itens={cardsDeListas(vitrine)}
        vazio="Ainda não tem lista por aqui — a primeira aparece nesta vitrine."
      />

      <div className="grid gap-10 md:grid-cols-3">
        <section className="flex flex-col gap-4 md:col-span-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
            Populares agora
          </h2>

          {(populares.estado === "ok" || populares.estado === "destaques") ? (
            <>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {populares.obras.slice(0, LIMITE_POPULARES).map(function (obra)
                {
                  return <CapaPopular key={obra.anilistId} obra={obra} />;
                })}
              </ul>
              <Link
                href="/catalogo"
                className="self-end text-sm text-acento underline underline-offset-4"
              >
                ver mais →
              </Link>
            </>
          ) : (
            <p className="text-sm text-texto-suave">
              O catálogo não respondeu agora — tente de novo em instantes.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
            Atividade recente
          </h2>

          {atividade.length === 0 ? (
            <p className="text-sm text-texto-suave">
              Ainda não tem resenha nem lista por aqui — a primeira aparece nesta seção.
            </p>
          ) : (
            <FeedDaComunidade itens={atividade.map(itemParaTela)} />
          )}
        </section>
      </div>

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
          <ul className="flex flex-wrap gap-4">
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

const FORMATO_QUANDO = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

/** Achata o item do feed para a tela: datas viram texto, chave única por tipo. */
function itemParaTela(item: AtividadeDaComunidade): ItemParaTela
{
  const quando = FORMATO_QUANDO.format(item.quando);

  if (item.tipo === "resenha")
  {
    return {
      tipo: "resenha",
      chave: `r-${item.entryId}`,
      username: item.username,
      anilistId: item.anilistId,
      titulo: item.titulo,
      coverImageUrl: item.coverImageUrl,
      rating: item.rating,
      review: item.review,
      containsSpoilers: item.containsSpoilers,
      curtidas: item.curtidas,
      quando,
    };
  }

  return {
    tipo: "lista",
    chave: `l-${item.listaId}`,
    username: item.username,
    listaId: item.listaId,
    nome: item.nome,
    totalDeObras: item.totalDeObras,
    capas: item.capas,
    curtidas: item.curtidas,
    quando,
  };
}

/** Os cards de cada carrossel (issue #76). */
function cardsDeResenhas(vitrine: VitrineDaHome)
{
  return vitrine.resenhas.map(function (r)
  {
    return (
      <CardResenha
        key={r.entryId}
        username={r.username}
        anilistId={r.anilistId}
        titulo={r.titulo}
        coverImageUrl={r.coverImageUrl}
        rating={r.rating}
        review={r.review}
        containsSpoilers={r.containsSpoilers}
        curtidas={r.curtidas}
        quando={FORMATO_QUANDO.format(r.quando)}
      />
    );
  });
}

function cardsDeListas(vitrine: VitrineDaHome)
{
  return vitrine.listas.map(function (l)
  {
    return (
      <CardLista
        key={l.listaId}
        listaId={l.listaId}
        username={l.username}
        nome={l.nome}
        totalDeObras={l.totalDeObras}
        capas={l.capas}
        curtidas={l.curtidas}
      />
    );
  });
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
    <li className="flex w-44 flex-col gap-2 rounded-lg border border-borda bg-superficie p-3">
      {entrada.obra.coverImageUrl ? (
        <Image
          src={entrada.obra.coverImageUrl}
          alt=""
          width={152}
          height={228}
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
        <Link href={`/obra/${entrada.obra.anilistId}`} className="hover:text-acento">
          {entrada.obra.titleEnglish ?? entrada.obra.titleRomaji}
        </Link>
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
        href={`/obra/${obra.anilistId}`}
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
