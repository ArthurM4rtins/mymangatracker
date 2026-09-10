"use client";

/**
 * A prateleira da PRÓPRIA lista (#51, #242). Arrastar um livro muda a posição;
 * as setas do painel fazem o mesmo pelo teclado, que arraste não tem.
 *
 * Ordem e remoção ficam em RASCUNHO até o Salvar: numa lista a ordem é o
 * conteúdo, e mexer nela grava a lista inteira a cada passo — quem organiza dez
 * obras mandava dez escritas e não podia desistir do caminho. Adicionar pela
 * busca continua entrando na hora: ali a pessoa procurou e escolheu.
 *
 * Salvar aplica os DELETE e só então o PUT da ordem — a rota exige permutação
 * exata do que restou, então a ordem não pode chegar antes das remoções.
 */
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { mover, reposicionar, type Direcao } from "@/server/domain/lista-ordem";
import { useRouter } from "@/i18n/navigation";
import { ColecaoVisual } from "../../componentes/colecao-visual";
import { CartaoObra } from "../../componentes/cartao-obra";

export type ItemParaOrdenar = {
  chave: string;
  titulo: string;
  coverImageUrl: string | null;
};

function mesmosIds(a: ItemParaOrdenar[], b: ItemParaOrdenar[]): boolean
{
  return a.length === b.length && a.every((item, i) => item.chave === b[i].chave);
}

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
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [recebidos, setRecebidos] = useState(itens);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Chegou lista nova do servidor (adicionar pela busca dá refresh): o rascunho
  // é preservado em vez de descartado. As obras que sumiram no servidor saem do
  // rascunho, e as que ele passou a ter entram no fim, onde a rota as colocou.
  if (itens !== recebidos)
  {
    const presentes = new Set(itens.map((item) => item.chave));
    const aindaRemovidos = removidos.filter((id) => presentes.has(id));
    const porId = new Map(itens.map((item) => [item.chave, item]));
    const mantidos = ordem
      .filter((item) => presentes.has(item.chave))
      .map((item) => porId.get(item.chave) as ItemParaOrdenar);
    const conhecidos = new Set([...ordem.map((item) => item.chave), ...aindaRemovidos]);

    setRecebidos(itens);
    setRemovidos(aindaRemovidos);
    setOrdem([...mantidos, ...itens.filter((item) => !conhecidos.has(item.chave))]);
  }

  const ordemMudou = !mesmosIds(ordem, itens.filter((item) => !removidos.includes(item.chave)));
  const pendentes = removidos.length + (ordemMudou ? 1 : 0);

  // Fechar a aba com rascunho por salvar pede confirmação do navegador. O texto
  // é dele, não nosso — desde 2016 nenhum navegador deixa a página escolher.
  useEffect(() => {
    if (pendentes === 0) return;
    function avisar(evento: BeforeUnloadEvent) { evento.preventDefault(); }
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [pendentes]);

  function moverItem(chave: string, direcao: Direcao)
  {
    setErro(null);
    setOrdem(function (atual)
    {
      const ids = mover(atual.map((item) => item.chave), chave, direcao);
      const porId = new Map(atual.map((item) => [item.chave, item]));
      return ids.map((id) => porId.get(id) as ItemParaOrdenar);
    });
  }

  function arrastarItem(chave: string, destino: number)
  {
    setErro(null);
    setOrdem(function (atual)
    {
      const ids = reposicionar(atual.map((item) => item.chave), chave, destino);
      const porId = new Map(atual.map((item) => [item.chave, item]));
      return ids.map((id) => porId.get(id) as ItemParaOrdenar);
    });
  }

  function removerItem(chave: string)
  {
    setErro(null);
    setRemovidos(function (atual) { return [...atual, chave]; });
    setOrdem(function (atual) { return atual.filter((item) => item.chave !== chave); });
  }

  function descartar()
  {
    setErro(null);
    setRemovidos([]);
    setOrdem(itens);
  }

  async function salvar()
  {
    setSalvando(true);
    setErro(null);

    try
    {
      // As remoções primeiro: a rota de ordem exige permutação exata do que
      // sobrou, então mandar a ordem antes seria pedido inválido.
      for (const chave of removidos)
      {
        const resposta = await fetch(`/api/v1/listas/${listaId}/itens`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ obra: chave }),
        });

        // 404 é obra que já não estava lá: o rascunho queria isso mesmo.
        if (!resposta.ok && resposta.status !== 404)
        {
          setErro(t("detalhe.rascunho.erro"));
          return;
        }
      }

      if (ordemMudou && ordem.length > 0)
      {
        const resposta = await fetch(`/api/v1/listas/${listaId}/ordem`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chaves: ordem.map((item) => item.chave) }),
        });

        if (!resposta.ok)
        {
          setErro(resposta.status === 429
            ? t("detalhe.rascunho.limite")
            : t("detalhe.rascunho.erro"));
          return;
        }
      }

      setRemovidos([]);
      roteador.refresh();
    }
    catch
    {
      setErro(t("detalhe.rascunho.erro"));
    }
    finally
    {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ColecaoVisual titulo={titulo} andarSimples
        classeGrade="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6"
        aoReordenar={arrastarItem}
        itens={ordem.map((item, indice) => ({
          id: item.chave,
          titulo: item.titulo,
          capa: item.coverImageUrl,
          detalhe: (
            <CartaoObra chave={item.chave} titulo={item.titulo} capa={item.coverImageUrl} acoes={
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex gap-1">
                  <Seta
                    rotulo={t("detalhe.ordenar.antes", { titulo: item.titulo })}
                    desativada={salvando || indice === 0}
                    aoClicar={function () { moverItem(item.chave, "cima"); }}
                  >
                    ←
                  </Seta>
                  <Seta
                    rotulo={t("detalhe.ordenar.depois", { titulo: item.titulo })}
                    desativada={salvando || indice === ordem.length - 1}
                    aoClicar={function () { moverItem(item.chave, "baixo"); }}
                  >
                    →
                  </Seta>
                </span>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={function () { removerItem(item.chave); }}
                  className="text-texto-suave underline underline-offset-4 hover:text-texto disabled:opacity-40"
                >
                  {t("detalhe.remover")}
                </button>
              </div>
            } />
          ),
        }))}
      />

      {pendentes > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-acento/40 bg-superficie p-3 text-sm">
          <span aria-live="polite" className="flex-1 text-texto-suave">
            {t("detalhe.rascunho.pendentes", { n: pendentes })}
          </span>
          {erro && <span role="alert" className="text-texto-suave">{erro}</span>}
          <button
            type="button"
            disabled={salvando}
            onClick={descartar}
            className="text-texto-suave underline underline-offset-4 hover:text-texto disabled:opacity-40"
          >
            {t("detalhe.rascunho.descartar")}
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={function () { void salvar(); }}
            className="rounded-md bg-acento px-3 py-1.5 font-medium text-fundo disabled:opacity-60"
          >
            {salvando ? t("detalhe.rascunho.salvando") : t("detalhe.rascunho.salvar")}
          </button>
        </div>
      )}
    </div>
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
