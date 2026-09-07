"use client";

/**
 * A grade da PRÓPRIA lista (issue #51): setas subir/descer montam a ordem
 * nova com a regra pura do domínio e mandam a ordem inteira num PUT; remover
 * continua o toggle de itens. Ordem otimista, volta se o servidor recusar.
 */
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mover, type Direcao } from "@/server/domain/lista-ordem";
import { RemoverDaLista } from "./acoes-da-lista";

export type ItemParaOrdenar = {
  anilistId: number;
  titulo: string;
  coverImageUrl: string | null;
};

export function ItensOrdenaveis({
  listaId,
  itens,
}: {
  listaId: string;
  itens: ItemParaOrdenar[];
})
{
  const roteador = useRouter();
  const [ordem, setOrdem] = useState(itens);
  const [ocupado, setOcupado] = useState(false);

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
    <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
      {ordem.map(function (item, indice)
      {
        return (
          <li key={item.anilistId} className="flex flex-col gap-1">
            <Link href={`/obra/${item.anilistId}`} className="group flex flex-col gap-1.5">
              {item.coverImageUrl ? (
                <Image
                  src={item.coverImageUrl}
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
                {item.titulo}
              </span>
            </Link>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex gap-1">
                <Seta
                  rotulo={`Mover ${item.titulo} para antes`}
                  desativada={ocupado || indice === 0}
                  aoClicar={function () { void moverItem(item.anilistId, "cima"); }}
                >
                  ←
                </Seta>
                <Seta
                  rotulo={`Mover ${item.titulo} para depois`}
                  desativada={ocupado || indice === ordem.length - 1}
                  aoClicar={function () { void moverItem(item.anilistId, "baixo"); }}
                >
                  →
                </Seta>
              </span>
              <RemoverDaLista listaId={listaId} anilistId={item.anilistId} />
            </div>
          </li>
        );
      })}
    </ul>
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
