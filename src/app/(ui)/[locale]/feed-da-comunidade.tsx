"use client";

/**
 * O feed da comunidade na home (issue #50): resenhas novas (nota, spoiler
 * escondido) e listas criadas, mescladas por data. Client só pelo glyph da
 * estrela; nenhuma ação aqui — curtir e comentar ficam na página da obra.
 */
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { estrelasTexto } from "./componentes/estrelas";

export type ItemParaTela =
  | {
      tipo: "resenha";
      chave: string;
      username: string;
      obraChave: string;
      titulo: string;
      coverImageUrl: string | null;
      rating: string | null;
      review: string;
      containsSpoilers: boolean;
      curtidas: number;
      quando: string;
    }
  | {
      tipo: "lista";
      chave: string;
      username: string;
      listaId: string;
      nome: string;
      totalDeObras: number;
      capas: Array<string | null>;
      curtidas: number;
      quando: string;
    };

export function FeedDaComunidade({ itens }: { itens: ItemParaTela[] })
{
  return (
    <ol className="flex flex-col gap-3">
      {itens.map(function (item)
      {
        return (
          <li key={item.chave} className="flex gap-3 rounded-lg border border-borda bg-superficie p-3">
            {item.tipo === "resenha" ? <Resenha item={item} /> : <Lista item={item} />}
          </li>
        );
      })}
    </ol>
  );
}

function Autor({ username, quando }: { username: string; quando: string })
{
  return (
    <span className="text-xs text-texto-suave">
      <Link href={`/u/${username}`} className="font-medium text-texto hover:text-acento">
        {username}
      </Link>{" "}
      · {quando}
    </span>
  );
}

function Resenha({ item }: { item: Extract<ItemParaTela, { tipo: "resenha" }> })
{
  const t = useTranslations("home");

  return (
    <>
      <Link href={`/obra/${item.obraChave.replace(":", "/")}`} className="shrink-0">
        {item.coverImageUrl ? (
          <Image
            src={item.coverImageUrl}
            alt=""
            width={48}
            height={72}
            className="h-[72px] w-12 rounded border border-borda object-cover"
            unoptimized
          />
        ) : (
          <div aria-hidden className="h-[72px] w-12 rounded border border-borda bg-fundo" />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <Autor username={item.username} quando={item.quando} />
          <span className="text-texto-suave">{t("feed.resenhou")}</span>
          <Link href={`/obra/${item.obraChave.replace(":", "/")}`} className="font-medium hover:text-acento">
            {item.titulo}
          </Link>
          {item.rating !== null && (
            <span aria-label={t("resenha.notaAria", { nota: item.rating })} className="text-nota">
              {estrelasTexto(Number(item.rating))}
            </span>
          )}
        </p>
        {item.containsSpoilers ? (
          <details className="text-sm">
            <summary className="cursor-pointer text-texto-suave">{t("resenha.spoilerMostrar")}</summary>
            <p className="mt-1 whitespace-pre-line">{item.review}</p>
          </details>
        ) : (
          <p className="line-clamp-2 text-sm text-texto-suave">{item.review}</p>
        )}
        {item.curtidas > 0 && (
          <span className="text-xs text-texto-suave">
            {item.curtidas} {t("contagem.curtidas", { n: item.curtidas })}
          </span>
        )}
      </div>
    </>
  );
}

function Lista({ item }: { item: Extract<ItemParaTela, { tipo: "lista" }> })
{
  const t = useTranslations("home");

  return (
    <>
      <Link href={`/listas/${item.listaId}`} className="flex shrink-0 -space-x-6">
        {item.capas.length === 0 ? (
          <div aria-hidden className="h-[72px] w-12 rounded border border-borda bg-fundo" />
        ) : (
          item.capas.slice(0, 3).map(function (capa, indice)
          {
            return capa ? (
              <Image
                key={indice}
                src={capa}
                alt=""
                width={48}
                height={72}
                className="h-[72px] w-12 rounded border border-borda object-cover"
                unoptimized
              />
            ) : (
              <div key={indice} aria-hidden className="h-[72px] w-12 rounded border border-borda bg-fundo" />
            );
          })
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <Autor username={item.username} quando={item.quando} />
          <span className="text-texto-suave">{t("feed.criouLista")}</span>
          <Link href={`/listas/${item.listaId}`} className="font-medium hover:text-acento">
            {item.nome}
          </Link>
        </p>
        <span className="text-xs text-texto-suave">
          {item.totalDeObras} {t("contagem.obras", { n: item.totalDeObras })}
          {item.curtidas > 0 && (
            <>
              {" "}· <span aria-hidden>♥</span> {item.curtidas}
              <span className="sr-only">{t("contagem.curtidasLeitorDeTela", { n: item.curtidas })}</span>
            </>
          )}
        </span>
      </div>
    </>
  );
}
