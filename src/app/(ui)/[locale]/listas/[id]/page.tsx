import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { listaComItensDoSistema, nomeDaListaDoSistema } from "@/server/services/lista.service";
import { Link, alternativasDeIdioma } from "@/i18n/navigation";
import { usuarioDaSessao } from "../../../../api/v1/_shared/sessao";
import { ApagarLista } from "./acoes-da-lista";
import { CurtirLista } from "./curtir-lista";
import { EditarLista } from "./editar-lista";
import { ItensOrdenaveis } from "./itens-ordenaveis";
import { idiomaDoSegmento } from "@/i18n/routing";
import { ColecaoVisual } from "../../componentes/colecao-visual";
import { CartaoObra } from "../../componentes/cartao-obra";

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

export default async function PaginaDaLista({ params }: PageProps<"/[locale]/listas/[id]">)
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

      {lista.itens.length === 0 ? (
        <p className="text-sm text-texto-suave">
          {t("detalhe.vazia")}
        </p>
      ) : lista.minha ? (
        <ItensOrdenaveis
          key={lista.listaId}
          listaId={lista.listaId}
          titulo={lista.nome}
          itens={lista.itens.map(function (item)
          {
            return {
              anilistId: item.anilistId,
              titulo: item.titleEnglish ?? item.titleRomaji,
              coverImageUrl: item.coverImageUrl,
            };
          })}
        />
      ) : (
        <ColecaoVisual titulo={lista.nome} andarSimples
          classeGrade="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6"
          itens={lista.itens.map((item) => ({
            id: item.anilistId,
            titulo: item.titleEnglish ?? item.titleRomaji,
            capa: item.coverImageUrl,
            detalhe: <CartaoObra anilistId={item.anilistId}
              titulo={item.titleEnglish ?? item.titleRomaji} capa={item.coverImageUrl} />,
          }))}
        />
      )}
    </main>
  );
}
