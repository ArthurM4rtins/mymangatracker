import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { listaComItensDoSistema, nomeDaListaDoSistema } from "@/server/services/lista.service";
import { buscarNoCatalogo, type ResultadoBusca } from "@/server/services/catalogo.service";
import { proxiesConfiaveis } from "@/server/services/limite.service";
import { interpretarFiltros } from "@/server/domain/catalogo-filtros";
import { escolherIp } from "@/server/domain/ip-do-visitante";
import { Link, alternativasDeIdioma } from "@/i18n/navigation";
import { usuarioDaSessao } from "../../../../api/v1/_shared/sessao";
import { ApagarLista } from "./acoes-da-lista";
import { AdicionarItem } from "./adicionar-item";
import { BuscaDaLista } from "./busca-da-lista";
import { CurtirLista } from "./curtir-lista";
import { EditarLista } from "./editar-lista";
import { ItensOrdenaveis } from "./itens-ordenaveis";
import { idiomaDoSegmento } from "@/i18n/routing";
import { ColecaoVisual } from "../../componentes/colecao-visual";
import { CartaoObra } from "../../componentes/cartao-obra";
import { chaveDaObra } from "@/server/domain/referencia-da-obra";
import { referenciaDaObra } from "@/server/domain/anilist-media";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/listas/[id]">)
{
  const { locale, id } = await params;
  const t = await getTranslations({ locale: idiomaDoSegmento(locale), namespace: "listas" });
  // Só o nome (#135): carregar a lista inteira aqui dobrava o custo de cada visita.
  const nome = await nomeDaListaDoSistema(id).catch(function () { return null; });

  return {
    title: nome ?? t("detalhe.meta.titulo"),
    alternates: alternativasDeIdioma(`/listas/${id}`),
  };
}

export default async function PaginaDaLista({ params, searchParams }: PageProps<"/[locale]/listas/[id]">)
{
  const { id } = await params;
  const userId = await usuarioDaSessao();
  const t = await getTranslations("listas");

  // Banco fora não é "lista não existe" (#65, item 13): degrada com aviso,
  // como /listas; só o null do serviço vira 404.
  let lista: Awaited<ReturnType<typeof listaComItensDoSistema>>;

  try
  {
    lista = await listaComItensDoSistema(id, userId);
  }
  catch
  {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
          {t("erros.semBanco")}
        </p>
      </main>
    );
  }

  if (lista === null)
  {
    notFound();
  }

  // A busca para adicionar (#237) é só do dono e só com termo: sem `?q=` a
  // página não vai ao AniList. Só o termo entra — os demais filtros do
  // catálogo não valem aqui. O IP é lido nesta camada, como no catálogo (#134).
  let busca: ResultadoBusca | null = null;

  if (lista.minha)
  {
    const { q } = await searchParams;
    const filtro = interpretarFiltros({ q });

    if (filtro.termo !== "")
    {
      const cabecalhos = await headers();
      const ip = escolherIp(function (nome) { return cabecalhos.get(nome); }, proxiesConfiaveis());
      busca = await buscarNoCatalogo(filtro, undefined, ip);
    }
  }

  const naLista = new Set(lista.itens.map(function (item) { return item.chave; }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">{lista.nome}</h1>
        <p className="text-xs text-texto-suave">
          {t.rich("detalhe.autoria", {
            username: lista.username,
            n: lista.itens.length,
            autor: function (conteudo)
            {
              return (
                <Link href={`/u/${lista.username}`} className="hover:text-acento hover:underline">
                  {conteudo}
                </Link>
              );
            },
          })}
        </p>
        {lista.descricao && (
          <p className="max-w-2xl text-sm text-texto-suave">{lista.descricao}</p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <CurtirLista
            listaId={lista.listaId}
            curtidas={lista.curtidas}
            curtiPorMim={lista.curtiPorMim}
            logado={userId !== null}
          />
          {lista.minha && (
            <EditarLista
              listaId={lista.listaId}
              nome={lista.nome}
              descricao={lista.descricao}
            />
          )}
          {lista.minha && <ApagarLista listaId={lista.listaId} />}
        </div>
      </header>

      {lista.minha && (
        <section className="flex flex-col gap-3">
          <BuscaDaLista listaId={lista.listaId} termoInicial={busca?.termo ?? ""} />
          {busca !== null && (
            <ResultadosDaBusca busca={busca} listaId={lista.listaId} naLista={naLista} />
          )}
        </section>
      )}

      {lista.itens.length === 0 ? (
        <p className="text-sm text-texto-suave">
          {lista.minha ? t("detalhe.vaziaPropria") : t("detalhe.vazia")}
        </p>
      ) : lista.minha ? (
        <ItensOrdenaveis
          key={lista.listaId}
          listaId={lista.listaId}
          titulo={lista.nome}
          itens={lista.itens.map(function (item)
          {
            return {
              chave: item.chave,
              titulo: item.titleEnglish ?? item.titleRomaji,
              coverImageUrl: item.coverImageUrl,
            };
          })}
        />
      ) : (
        <ColecaoVisual titulo={lista.nome} andarSimples
          classeGrade="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6"
          itens={lista.itens.map((item) => ({
            id: item.chave,
            titulo: item.titleEnglish ?? item.titleRomaji,
            capa: item.coverImageUrl,
            detalhe: <CartaoObra chave={item.chave}
              titulo={item.titleEnglish ?? item.titleRomaji} capa={item.coverImageUrl} />,
          }))}
        />
      )}
    </main>
  );
}

async function ResultadosDaBusca({
  busca,
  listaId,
  naLista,
}: {
  busca: ResultadoBusca;
  listaId: string;
  naLista: ReadonlySet<string>;
})
{
  const t = await getTranslations("listas");

  if (busca.estado === "indisponivel")
  {
    return <p className="text-sm text-texto-suave">{t("detalhe.busca.indisponivel")}</p>;
  }

  if (busca.estado === "muitos_pedidos")
  {
    return <p className="text-sm text-texto-suave">{t("detalhe.busca.muitosPedidos")}</p>;
  }

  if (busca.estado === "vazio" || busca.estado === "destaques")
  {
    return (
      <p className="text-sm text-texto-suave">
        {t("detalhe.busca.semResultado", { termo: busca.termo })}
      </p>
    );
  }

  // A fonte pode repetir uma obra na mesma página (visto no Kitsu com o AniList
  // fora, 10/09/2026): a chave da linha é o anilistId, então dedupe aqui.
  const obras = [...new Map(busca.obras.map(function (obra) { return [obra.anilistId, obra]; })).values()];

  return (
    <ul className="flex max-h-96 flex-col divide-y divide-borda overflow-y-auto rounded-md border border-borda bg-superficie">
      {obras.map(function (obra)
      {
        const titulo = obra.titleEnglish ?? obra.titleRomaji;

        return (
          <li key={chaveDaObra(referenciaDaObra(obra))} className="flex items-center gap-3 px-3 py-2">
            {obra.coverImageUrl ? (
              <Image
                src={obra.coverImageUrl}
                alt=""
                width={32}
                height={48}
                unoptimized
                className="h-12 w-8 shrink-0 rounded-sm object-cover"
              />
            ) : (
              <span aria-hidden className="h-12 w-8 shrink-0 rounded-sm bg-fundo" />
            )}
            <Link
              href={`/obra/${obra.anilistId}`}
              className="min-w-0 flex-1 truncate text-sm hover:text-acento"
            >
              {titulo}
              {obra.startYear !== undefined && (
                <span className="ml-2 text-xs text-texto-suave">{obra.startYear}</span>
              )}
            </Link>
            <AdicionarItem
              listaId={listaId}
              chave={chaveDaObra(referenciaDaObra(obra))}
              jaNaLista={naLista.has(chaveDaObra(referenciaDaObra(obra)))}
            />
          </li>
        );
      })}
    </ul>
  );
}
