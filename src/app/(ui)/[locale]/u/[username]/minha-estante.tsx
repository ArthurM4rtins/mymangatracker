"use client";

/**
 * A estante no perfil do PRÓPRIO dono: abas por status com contagem, capas e
 * o capítulo atual embaixo de cada uma. Nunca renderiza para outro usuário —
 * o serviço só entrega `estante` quando quem olha é o dono.
 */
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { STATUS_DA_ESTANTE, type StatusDaEstante } from "@/server/domain/perfil";
import { Link } from "@/i18n/navigation";

export type EntradaParaTela = {
  entradaId: string;
  status: StatusDaEstante;
  progressChapter: string | null;
  anilistId: number;
  titulo: string;
  coverImageUrl: string | null;
};

export function MinhaEstante({
  contagem,
  entradas,
}: {
  contagem: Record<StatusDaEstante, number>;
  entradas: EntradaParaTela[];
})
{
  const [aba, setAba] = useState<StatusDaEstante>("READING");
  const t = useTranslations("perfil");
  const c = useTranslations("comum");
  const visiveis = entradas.filter(function (e) { return e.status === aba; });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-texto-suave">
          {t("estante.titulo")}
        </h2>
        <Link
          href="/estante"
          className="text-xs text-texto-suave underline underline-offset-4 hover:text-texto"
        >
          {t("estante.gerenciar")}
        </Link>
      </div>

      <div role="tablist" aria-label={t("estante.abas")} className="flex flex-wrap gap-2">
        {STATUS_DA_ESTANTE.map(function (status)
        {
          const ativa = status === aba;

          return (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={function () { setAba(status); }}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                ativa
                  ? "border-acento bg-acento/10 text-texto"
                  : "border-borda text-texto-suave hover:text-texto"
              }`}
            >
              {c(`status.${status}`)}{" "}
              <span className="font-marca font-bold">{contagem[status]}</span>
            </button>
          );
        })}
      </div>

      {visiveis.length === 0 ? (
        <p className="text-sm text-texto-suave">
          {t("estante.vazia", { status: c(`status.${aba}`).toLowerCase() })}
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6">
          {visiveis.map(function (entrada)
          {
            return (
              <li key={entrada.entradaId}>
                <Link
                  href={`/obra/${entrada.anilistId}`}
                  className="group flex flex-col gap-1.5"
                  title={entrada.titulo}
                >
                  <Capa src={entrada.coverImageUrl} />
                  <span className="truncate text-xs">{entrada.titulo}</span>
                  <span className="text-xs text-texto-suave">
                    {entrada.progressChapter === null
                      ? t("estante.semCapitulo")
                      : t("estante.capitulo", { n: entrada.progressChapter })}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function Capa({ src }: { src: string | null })
{
  return src ? (
    <Image
      src={src}
      alt=""
      width={160}
      height={240}
      className="aspect-[2/3] w-full rounded border border-borda object-cover transition-transform group-hover:scale-[1.02]"
      unoptimized
    />
  ) : (
    <div aria-hidden className="aspect-[2/3] w-full rounded border border-borda bg-fundo" />
  );
}
