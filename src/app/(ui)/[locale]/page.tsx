import { getLocale, getTranslations } from "next-intl/server";
// A rota de API não tem prefixo de idioma (D2 do desenho): o link do rodapé usa
// o `Link` cru, não o de `@/i18n/navigation`, senão vira `/pt-BR/api/v1/health`.
import LinkExterno from "next/link";
import { Link } from "@/i18n/navigation";
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
import { ColecaoVisual } from "./componentes/colecao-visual";
import { CartaoObra } from "./componentes/cartao-obra";
import { CardLista, CardResenha } from "./vitrine-cards";
import { usuarioDaSessao } from "../../api/v1/_shared/sessao";
import { ContinuarLeitura } from "./estante/continuar-leitura";

// Mede o agora e depende da sessão: nunca pré-renderizada, nunca de cache.
export const dynamic = "force-dynamic";

const LIMITE_CONTINUAR = 4;
const LIMITE_POPULARES = 12;

/** As dependências que têm rótulo traduzido; o health check pode listar outras. */
const DEPENDENCIAS_COM_ROTULO = ["database", "anilist"] as const;

function temRotulo(nome: string): nome is (typeof DEPENDENCIAS_COM_ROTULO)[number]
{
  return DEPENDENCIAS_COM_ROTULO.some(function (conhecida) { return conhecida === nome; });
}

export default async function Home()
{
  const userId = await usuarioDaSessao();
  const t = await getTranslations("home");
  const idioma = await getLocale();

  const [saude, populares, leitura, atividade, vitrine] = await Promise.all([
    verificarSaudeDoSistema(),
    buscarNoCatalogo(interpretarFiltros({})),
    userId ? dadosDeLeitura(userId) : Promise.resolve(null),
    feedDaComunidadeDoSistema(),
    vitrineDaHomeDoSistema(),
  ]);

  const resumoDaSaude = t(`saude.resumo.${saude.status}`);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 px-6 py-12">
      {saude.status !== "ok" && (
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          {t("saude.aviso", {
            estado: resumoDaSaude,
            dependencias: saude.dependencies
              .filter(function (dependencia) { return dependencia.status !== "ok"; })
              .map(function (dependencia)
              {
                const nome = temRotulo(dependencia.name)
                  ? t(`saude.dependencia.${dependencia.name}`)
                  : dependencia.name;

                return `${nome} ${t(`saude.estado.${dependencia.status}`)}`;
              })
              .join(", "),
          })}
        </p>
      )}

      {leitura ? (
        <BoasVindas leitura={leitura} />
      ) : (
        <Apresentacao />
      )}

      <Carrossel
        titulo={t("vitrine.resenhas.titulo")}
        itens={cardsDeResenhas(vitrine, idioma)}
        vazio={t("vitrine.resenhas.vazio")}
      />

      <Carrossel
        titulo={t("vitrine.listas.titulo")}
        itens={cardsDeListas(vitrine)}
        vazio={t("vitrine.listas.vazio")}
      />

      <div className="grid gap-10 md:grid-cols-3">
        <section className="flex min-w-0 flex-col gap-4 md:col-span-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
            {t("populares.titulo")}
          </h2>

          {(populares.estado === "ok" || populares.estado === "destaques") ? (
            <>
              <ColecaoVisual
                titulo={t("populares.titulo")}
                classeGrade="grid grid-cols-3 gap-3 sm:grid-cols-4"
                itens={populares.obras.slice(0, LIMITE_POPULARES).map((obra) => ({
                  id: obra.anilistId,
                  titulo: obra.titleEnglish ?? obra.titleRomaji,
                  capa: obra.coverImageUrl ?? null,
                  detalhe: <CartaoObra anilistId={obra.anilistId}
                    titulo={obra.titleEnglish ?? obra.titleRomaji} capa={obra.coverImageUrl ?? null} />,
                }))}
              />
              <Link
                href="/catalogo"
                className="self-end text-sm text-acento underline underline-offset-4"
              >
                {t("populares.verMais")}
              </Link>
            </>
          ) : (
            <p className="text-sm text-texto-suave">
              {t("populares.indisponivel")}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
            {t("atividade.titulo")}
          </h2>

          {atividade.length === 0 ? (
            <p className="text-sm text-texto-suave">
              {t("atividade.vazia")}
            </p>
          ) : (
            <FeedDaComunidade
              itens={atividade.map(function (item)
              {
                return itemParaTela(item, formatoDoQuando(idioma));
              })}
            />
          )}
        </section>
      </div>

      <footer className="mt-auto border-t border-borda pt-4 text-xs text-texto-suave">
        <p>
          <span aria-hidden>{saude.status === "ok" ? "●" : "○"}</span>{" "}
          {t("rodape.verificado", { estado: resumoDaSaude, quando: saude.checkedAt })} ·{" "}
          <LinkExterno href="/api/v1/health" className="underline underline-offset-4">
            /api/v1/health
          </LinkExterno>
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
    const [perfil, estante] = await Promise.all([
      perfilDoUsuarioDoSistema(userId),
      listarEstanteDoSistema({ userId }),
    ]);

    if (perfil === null)
    {
      return null;
    }

    // "Estante vazia" olha a estante inteira, não só o que está em leitura
    // (#65, item 1): quem tem 12 obras planejadas não é mandado adicionar a primeira.
    const lendo = estante.filter(function (entrada) { return entrada.status === "READING"; });

    return {
      username: perfil.username,
      continuar: lendo
        .filter(function (entrada) { return entrada.continuarEm !== null; })
        .slice(0, LIMITE_CONTINUAR),
      temEstante: estante.length > 0,
    };
  }
  catch
  {
    return null;
  }
}

async function BoasVindas({ leitura }: { leitura: DadosDeLeitura })
{
  const t = await getTranslations("home");

  return (
    <section className="flex flex-col gap-5">
      <h1 className="font-marca text-3xl font-bold tracking-tight">
        {t("boasVindas.titulo", { username: leitura.username })}
      </h1>

      {leitura.continuar.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
            {t("boasVindas.continuarLendo")}
          </h2>
          <ColecaoVisual
            titulo={t("boasVindas.continuarLendo")}
            classeGrade="grid grid-cols-2 gap-4 sm:grid-cols-4"
            itens={leitura.continuar.map((entrada) => ({
              id: entrada.obra.anilistId,
              titulo: entrada.obra.titleEnglish ?? entrada.obra.titleRomaji,
              capa: entrada.obra.coverImageUrl,
              detalhe: <CartaoObra anilistId={entrada.obra.anilistId}
                titulo={entrada.obra.titleEnglish ?? entrada.obra.titleRomaji}
                capa={entrada.obra.coverImageUrl}
                acoes={<ContinuarLeitura continuarEm={entrada.continuarEm} compacto />} />,
            }))}
          />
        </div>
      ) : (
        <p className="text-texto-suave">
          {leitura.temEstante
            ? t.rich("boasVindas.semFonte", {
                estante: function (trechos)
                {
                  return (
                    <Link href="/estante" className="text-acento underline underline-offset-4">
                      {trechos}
                    </Link>
                  );
                },
              })
            : t.rich("boasVindas.estanteVazia", {
                catalogo: function (trechos)
                {
                  return (
                    <Link href="/catalogo" className="text-acento underline underline-offset-4">
                      {trechos}
                    </Link>
                  );
                },
              })}
        </p>
      )}
    </section>
  );
}

/**
 * Data curta do feed, no idioma de quem está lendo. `Intl` nativo, e não o
 * `getFormatter()` do next-intl: sem `timeZone` explícito o nativo usa o fuso
 * de quem executa, que é o que esta tela sempre fez.
 */
function formatoDoQuando(idioma: string): Intl.DateTimeFormat
{
  return new Intl.DateTimeFormat(idioma, { day: "2-digit", month: "short" });
}

/** Achata o item do feed para a tela: datas viram texto, chave única por tipo. */
function itemParaTela(item: AtividadeDaComunidade, formato: Intl.DateTimeFormat): ItemParaTela
{
  const quando = formato.format(item.quando);

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
function cardsDeResenhas(vitrine: VitrineDaHome, idioma: string)
{
  const formato = formatoDoQuando(idioma);

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
        quando={formato.format(r.quando)}
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

async function Apresentacao()
{
  const t = await getTranslations("home");

  return (
    <section className="flex flex-col gap-5">
      <h1 className="font-marca text-4xl font-bold tracking-tight">Kidoku</h1>
      <p className="max-w-xl text-lg text-texto-suave">
        {t("apresentacao.descricao")}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/cadastrar"
          className="rounded-md bg-acento px-4 py-2 text-sm font-medium text-acento-contraste"
        >
          {t("apresentacao.criarConta")}
        </Link>
        <Link
          href="/entrar"
          className="rounded-md border border-borda px-4 py-2 text-sm text-texto transition-colors hover:border-acento"
        >
          {t("apresentacao.entrar")}
        </Link>
      </div>
    </section>
  );
}
