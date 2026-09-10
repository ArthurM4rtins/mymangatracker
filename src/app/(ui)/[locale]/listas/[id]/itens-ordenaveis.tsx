"use client";

/**
 * A grade da PRÓPRIA lista (issue #51): setas subir/descer montam a ordem
 * nova com a regra pura do domínio e mandam a ordem inteira num PUT; remover
 * continua o toggle de itens. Ordem otimista, volta se o servidor recusar.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";
import { mover, type Direcao } from "@/server/domain/lista-ordem";
import { useRouter } from "@/i18n/navigation";
import { RemoverDaLista } from "./acoes-da-lista";
import { ColecaoVisual } from "../../componentes/colecao-visual";
import { CartaoObra } from "../../componentes/cartao-obra";

export type ItemParaOrdenar = {
  anilistId: number;
  titulo: string;
  coverImageUrl: string | null;
};

export function ItensOrdenaveis({
  listaId,
  titulo,
  itens,
}: {
  listaId: string;
  titulo: string;
  itens: ItemParaOrdenar[];
})
{
  const roteador = useRouter();
  const t = useTranslations("listas");
  const [ordem, setOrdem] = useState(itens);
  const [recebidos, setRecebidos] = useState(itens);
  const [ocupado, setOcupado] = useState(false);

  // Atualiza após refresh sem remontar a coleção: reordenar mantém o painel
  // aberto, e remover tira da prateleira o item que deixou de existir.
  if (itens !== recebidos)
  {
    setRecebidos(itens);
    setOrdem(itens);
  }

  async function moverItem(anilistId: number, direcao: Direcao)
  {
    const ids = ordem.map(function (i) { return i.anilistId; });
    const novosIds = mover(ids, anilistId, direcao);

    if (novosIds.join() === ids.join())
    {
      return;
    }

    const antes = ordem;
    const porId = new Map(ordem.map(function (i) { return [i.anilistId, i]; }));
    setOrdem(novosIds.map(function (id) { return porId.get(id) as ItemParaOrdenar; }));
    setOcupado(true);

    try
    {
      const resposta = await fetch(`/api/v1/listas/${listaId}/ordem`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anilistIds: novosIds }),
      });

      if (!resposta.ok)
      {
        setOrdem(antes);
        return;
      }

      roteador.refresh();
    }
    catch
    {
      setOrdem(antes);
    }
    finally
    {
      setOcupado(false);
    }
  }

  return (
    <ColecaoVisual titulo={titulo} andarSimples
      classeGrade="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6"
      itens={ordem.map((item, indice) => ({
        id: item.anilistId,
        titulo: item.titulo,
        capa: item.coverImageUrl,
        detalhe: (
          <CartaoObra anilistId={item.anilistId} titulo={item.titulo} capa={item.coverImageUrl} acoes={
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex gap-1">
                <Seta
                  rotulo={t("detalhe.ordenar.antes", { titulo: item.titulo })}
                  desativada={ocupado || indice === 0}
                  aoClicar={function () { void moverItem(item.anilistId, "cima"); }}
                >
                  ←
                </Seta>
                <Seta
                  rotulo={t("detalhe.ordenar.depois", { titulo: item.titulo })}
                  desativada={ocupado || indice === ordem.length - 1}
                  aoClicar={function () { void moverItem(item.anilistId, "baixo"); }}
                >
                  →
                </Seta>
              </span>
              <RemoverDaLista listaId={listaId} anilistId={item.anilistId} />
            </div>
          } />
        ),
      }))}
    />
  );
}

function Seta({
  rotulo,
  desativada,
  aoClicar,
  children,
}: {
  rotulo: string;
  desativada: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
})
{
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      disabled={desativada}
      onClick={aoClicar}
      className="rounded border border-borda px-1.5 py-0.5 text-texto-suave hover:text-texto disabled:opacity-30"
    >
      {children}
    </button>
  );
}
