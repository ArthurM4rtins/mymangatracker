"use client";

/**
 * A grade pública de obras avaliadas: capa, título e a nota embaixo. Client
 * só por causa do glyph da estrela, que vive num módulo client.
 */
import { useTranslations } from "next-intl";
import { estrelasTexto } from "../../componentes/estrelas";
import { ColecaoVisual } from "../../componentes/colecao-visual";
import { CartaoObra } from "../../componentes/cartao-obra";

export type AvaliadaParaTela = {
  anilistId: number;
  titulo: string;
  coverImageUrl: string | null;
  rating: number;
};

export function GradeAvaliadas({ avaliadas }: { avaliadas: AvaliadaParaTela[] })
{
  const t = useTranslations("perfil");

  return (
    <ColecaoVisual titulo={t("avaliadas.titulo")} andarSimples
      classeGrade="grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6"
      itens={avaliadas.map((obra) => ({
        id: obra.anilistId,
        titulo: obra.titulo,
        capa: obra.coverImageUrl,
        detalhe: (
          <CartaoObra anilistId={obra.anilistId} titulo={obra.titulo} capa={obra.coverImageUrl}>
            <span aria-label={t("notaAria", { nota: String(obra.rating) })} className="text-xs text-acento">
              {estrelasTexto(obra.rating)}
            </span>
          </CartaoObra>
        ),
      }))}
    />
  );
}
