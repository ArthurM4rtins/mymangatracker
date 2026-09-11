"use client";

/**
 * Uma resenha no perfil público: capa e título da obra, nota, texto (spoiler
 * escondido por padrão) e curtidas. Sem ação — curtir e comentar ficam na
 * página da obra.
 */
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { estrelasTexto } from "../../componentes/estrelas";

export type ResenhaParaTela = {
  entryId: string;
  chave: string;
  titulo: string;
  coverImageUrl: string | null;
  rating: string | null;
  review: string;
  containsSpoilers: boolean;
  publicadaEm: string;
  curtidas: number;
};

export function ResenhaDoPerfil({ resenha }: { resenha: ResenhaParaTela })
{
  const t = useTranslations("perfil");

  return (
    <li className="flex gap-4 rounded-lg border border-borda bg-superficie p-4">
      <Link href={`/obra/${resenha.chave.replace(":", "/")}`} className="shrink-0">
        {resenha.coverImageUrl ? (
          <Image
            src={resenha.coverImageUrl}
            alt=""
            width={64}
            height={96}
            className="h-24 w-16 rounded border border-borda object-cover"
            unoptimized
          />
        ) : (
          <div aria-hidden className="h-24 w-16 rounded border border-borda bg-fundo" />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={`/obra/${resenha.chave.replace(":", "/")}`}
            className="font-medium hover:text-acento"
          >
            {resenha.titulo}
          </Link>
          {resenha.rating !== null && (
            <span aria-label={t("notaAria", { nota: resenha.rating })} className="text-acento">
              {estrelasTexto(Number(resenha.rating))}
            </span>
          )}
          <span className="text-xs text-texto-suave">{resenha.publicadaEm}</span>
        </p>

        {resenha.containsSpoilers ? (
          <details className="text-sm">
            <summary className="cursor-pointer text-texto-suave">
              {t("resenhas.spoiler")}
            </summary>
            <p className="mt-2 whitespace-pre-line">{resenha.review}</p>
          </details>
        ) : (
          <p className="line-clamp-4 whitespace-pre-line text-sm">{resenha.review}</p>
        )}

        <p className="text-xs text-texto-suave">
          {/* `n` escolhe o ramo do plural; `valor` imprime o número cru — o `#` do ICU
              passaria pelo Intl.NumberFormat e viraria "1.000 curtidas". */}
          {t("resenhas.curtidas", {
            n: resenha.curtidas,
            valor: String(resenha.curtidas),
          })}
        </p>
      </div>
    </li>
  );
}
