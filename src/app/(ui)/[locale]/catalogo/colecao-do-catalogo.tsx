"use client";

/**
 * A coleção do catálogo com "ver mais": a primeira página vem renderizada pelo
 * servidor, as seguintes chegam pela API quando a pessoa pede, e a prateleira
 * enche cada andar com o que cabe na largura.
 *
 * Botão, não rolagem automática, de propósito: cada página é uma ida ao AniList
 * (ou ao Kitsu) pela cota compartilhada, e rolagem infinita dispara isso sem a
 * pessoa querer. Quem quer descobrir mais clica — e o teto por IP da busca
 * continua valendo para cada clique.
 */
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { ObraDoCatalogoDTO, PaginaDoCatalogoDTO } from "@/server/services/catalogo.service";
import { CartaoObra } from "../componentes/cartao-obra";
import { ColecaoVisual, type ItemDaColecao } from "../componentes/colecao-visual";
import { BotaoEstante } from "./botao-estante";

export function ColecaoDoCatalogo({ inicial, temMaisInicial, consulta, tituloDoGrupo }: {
  inicial: ObraDoCatalogoDTO[];
  temMaisInicial: boolean;
  /** A query string dos filtros atuais, sem a página. */
  consulta: string;
  tituloDoGrupo: string;
})
{
  const t = useTranslations("catalogo");
  const c = useTranslations("comum");
  const [obras, setObras] = useState(inicial);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(temMaisInicial);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  async function carregarMais()
  {
    setCarregando(true);
    setErro(false);

    try
    {
      const proxima = pagina + 1;
      const separador = consulta === "" ? "" : "&";
      const resposta = await fetch(`/api/v1/catalogo?${consulta}${separador}pagina=${proxima}`);

      if (!resposta.ok)
      {
        setErro(true);
        return;
      }

      const corpo = (await resposta.json()) as PaginaDoCatalogoDTO;
      // Obra repetida entre páginas (o AniList reordena entre pedidos) não
      // duplica card: a chave da prateleira é o anilistId.
      const vistos = new Set(obras.map(function (obra) { return obra.anilistId; }));
      const novas = corpo.obras.filter(function (obra) { return !vistos.has(obra.anilistId); });

      setObras(obras.concat(novas));
      setPagina(proxima);
      setTemMais(corpo.temMais && novas.length > 0);
    }
    catch
    {
      setErro(true);
    }
    finally
    {
      setCarregando(false);
    }
  }

  const itens: ItemDaColecao[] = obras.map(function (obra)
  {
    const rotulo = obra.tipo === "NOVEL"
      ? c("formato.NOVEL")
      : obra.pais ? c(`formato.${obra.pais}`) : t("cartao.formatoGenerico");

    return {
      id: obra.anilistId,
      titulo: obra.titulo,
      capa: obra.capa,
      detalhe: (
        <CartaoObra
          anilistId={obra.anilistId}
          titulo={obra.titulo}
          capa={obra.capa}
          acoes={<BotaoEstante anilistId={obra.anilistId} jaNaEstante={obra.jaNaEstante} />}
        >
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-texto-suave">
            <span className="rounded-full border border-borda px-2 py-0.5">{rotulo}</span>
            {obra.capitulos !== null && (
              <span className="tabular-nums">{t("cartao.capitulos", { n: obra.capitulos })}</span>
            )}
          </p>
          {obra.descricao && (
            <p className="line-clamp-3 text-sm text-texto-suave">{obra.descricao}</p>
          )}
        </CartaoObra>
      ),
    };
  });

  return (
    <section className="flex flex-col gap-4">
      <ColecaoVisual itens={itens} titulo={tituloDoGrupo} andarSimples />

      {/* O "ver mais" mora no fim do último andar: é onde a pessoa está quando
          acabou de ver o que tinha. */}
      {temMais ? (
        <button
          type="button"
          onClick={function () { void carregarMais(); }}
          disabled={carregando}
          className="self-center rounded-md border border-borda px-4 py-2 text-sm hover:border-acento disabled:opacity-60"
        >
          {carregando ? t("mais.carregando") : t("mais.verMais")}
        </button>
      ) : (
        <p className="self-center text-xs text-texto-suave">{t("mais.fim")}</p>
      )}

      {erro && (
        <p role="alert" className="self-center text-sm text-nota">{t("mais.erroMais")}</p>
      )}
    </section>
  );
}
