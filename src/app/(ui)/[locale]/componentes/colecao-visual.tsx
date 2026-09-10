"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

import { emAndaresPelaLargura, LARGURA_ABERTA, larguraDaLombada, RECUO_DO_TRILHO, VAO } from "./andares";
import estilos from "./colecao-visual.module.css";

/** Os cards chegam prontos do servidor; a prateleira só controla a apresentação. */
export type ItemDaColecao = {
  id: number;
  titulo: string;
  capa: string | null;
  detalhe: ReactNode;
};

export type GrupoDaColecao = {
  id: string;
  titulo: string;
  itens: ItemDaColecao[];
};

const CORES = ["#733c35", "#344d53", "#586044", "#71516b", "#865f33", "#364868", "#55504a"];

export function ColecaoVisual({ itens, grupos, titulo, inicial = "grade", classeGrade = "grid gap-4 sm:grid-cols-2", andarSimples = false, maximoPorAndar }: {
  itens: ItemDaColecao[];
  grupos?: GrupoDaColecao[];
  titulo: string;
  inicial?: "grade" | "prateleira";
  classeGrade?: string;
  /**
   * Andares simples: a coleção vira uma estante de verdade. A prateleira mede
   * a própria largura e enche cada andar com o que cabe; não tem cabeçalho
   * (nem título, nem número, nem setas), os andares ficam colados, e o trilho
   * não rola — a vitrine fecha quando outro livro abre, então a largura total
   * não muda. `grupos` é ignorado nesse modo; o nome de cada andar existe só
   * para o leitor de tela.
   */
  andarSimples?: boolean;
  /** Teto de obras por andar no modo simples, se a tela quiser um (a home usa 9). */
  maximoPorAndar?: number;
})
{
  const t = useTranslations("colecao");
  const [modo, setModo] = useState(inicial);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const item = itens.find((obra) => obra.id === selecionado);
  const conteudoId = useId();
  const botaoPrateleira = useRef<HTMLButtonElement>(null);
  const estante = useRef<HTMLDivElement>(null);
  const [larguraDoTrilho, setLarguraDoTrilho] = useState(0);

  // Uma remoção ou filtro não deve reabrir o painel se a obra reaparecer.
  if (selecionado !== null && !item) setSelecionado(null);

  // Antes de pintar, para o andar já nascer com o tanto que cabe; e de novo a
  // cada mudança de largura (janela, painel lateral, rotação do celular).
  useLayoutEffect(() => {
    const caixa = estante.current;
    if (!andarSimples || modo !== "prateleira" || !caixa) return;
    function medir() { if (caixa) setLarguraDoTrilho(caixa.clientWidth); }
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(caixa);
    return () => observador.disconnect();
  }, [andarSimples, modo]);

  const andares: GrupoDaColecao[] = andarSimples
    ? emAndaresPelaLargura(itens, larguraDoTrilho, maximoPorAndar).map((andar, indice) => ({
      id: `andar-${indice + 1}`,
      titulo: t("andar", { n: indice + 1 }),
      itens: andar,
    }))
    : grupos ?? [{ id: "obras", titulo, itens }];

  // As medidas que o empacotamento usa são as mesmas que o CSS desenha.
  const medidas = {
    "--largura-aberta": `${LARGURA_ABERTA}px`,
    "--recuo-do-trilho": `${RECUO_DO_TRILHO}px`,
    "--vao": `${VAO}px`,
  } as CSSProperties;

  return (
    <div className={estilos.colecao} style={medidas}>
      <div className={estilos.barra}>
        <p className={estilos.contagem}>{t("contagem", { n: itens.length })}</p>
        <div className={estilos.modos} role="group" aria-label={t("visualizacao")}>
          {(["grade", "prateleira"] as const).map((opcao) => (
            <button key={opcao} type="button" aria-pressed={modo === opcao}
              ref={opcao === "prateleira" ? botaoPrateleira : undefined}
              aria-controls={conteudoId} onClick={() => setModo(opcao)}>
              <IconeModo prateleira={opcao === "prateleira"} />
              {t(opcao)}
            </button>
          ))}
        </div>
      </div>

      <div id={conteudoId}>
        {modo === "grade" ? (
          <ul aria-label={titulo} className={classeGrade}>
            {itens.map((obra) => <Fragment key={obra.id}>{obra.detalhe}</Fragment>)}
          </ul>
        ) : (
          <div ref={estante} className={estilos.prateleiras} data-simples={andarSimples || undefined}>
            <p className={estilos.dica}>{t("dica")}</p>
            {andares.filter((grupo) => grupo.itens.length > 0).map((grupo, indice) => (
              <Prateleira key={grupo.id} grupo={grupo} numero={indice + 1} aoAbrir={setSelecionado}
                simples={andarSimples} />
            ))}
          </div>
        )}
      </div>

      {modo === "prateleira" && item && (
        <DetalheDaColecao item={item} aoFechar={() => setSelecionado(null)} focoAlternativo={botaoPrateleira} />
      )}
    </div>
  );
}

function Prateleira({ grupo, numero, aoAbrir, simples }: {
  grupo: GrupoDaColecao;
  numero: number;
  aoAbrir: (id: number) => void;
  simples: boolean;
})
{
  const t = useTranslations("colecao");
  const trilho = useRef<HTMLUListElement>(null);
  const tituloId = useId();
  const trilhoId = useId();
  const [limites, setLimites] = useState({ inicio: true, fim: true });
  const arraste = useRef<{ x: number; scroll: number; moveu: boolean } | null>(null);
  const suprimirClique = useRef(false);

  useEffect(() => {
    const lista = trilho.current;
    if (!lista) return;
    function medir()
    {
      if (!lista) return;
      setLimites({ inicio: lista.scrollLeft <= 2, fim: lista.scrollLeft + lista.clientWidth >= lista.scrollWidth - 2 });
    }
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(lista);
    // A largura dos livros também muda quando uma capa se abre.
    for (const livro of lista.children) observador.observe(livro);
    lista.addEventListener("scroll", medir, { passive: true });
    return () => { observador.disconnect(); lista.removeEventListener("scroll", medir); };
  }, [grupo.itens.length]);

  function rolar(direcao: number)
  {
    const lista = trilho.current;
    if (!lista) return;
    lista.scrollBy({ left: direcao * lista.clientWidth * 0.7,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return (
    <section aria-labelledby={simples ? undefined : tituloId} aria-label={simples ? grupo.titulo : undefined}
      className={estilos.secao} data-simples={simples || undefined}>
      {!simples && (
        <div className={estilos.cabecalho}>
          <div className={estilos.identificacao}>
            <span aria-hidden className={estilos.numero}>{String(numero).padStart(2, "0")}</span>
            <h2 id={tituloId}>{grupo.titulo}</h2>
            <span className={estilos.quantidade}>{t("contagem", { n: grupo.itens.length })}</span>
          </div>
          <div className={estilos.setas}>
            <button type="button" aria-label={t("anterior", { grupo: grupo.titulo })}
              aria-controls={trilhoId} disabled={limites.inicio} onClick={() => rolar(-1)}>←</button>
            <button type="button" aria-label={t("proxima", { grupo: grupo.titulo })}
              aria-controls={trilhoId} disabled={limites.fim} onClick={() => rolar(1)}>→</button>
          </div>
        </div>
      )}

      <div className={estilos.movel}>
        <ul ref={trilho} id={trilhoId} aria-labelledby={simples ? undefined : tituloId}
          aria-label={simples ? grupo.titulo : undefined} className={estilos.trilho}
          onKeyDown={(evento) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(evento.key)) return;
            const botoes = Array.from(evento.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
            const atual = botoes.indexOf(document.activeElement as HTMLButtonElement);
            if (atual < 0) return;
            evento.preventDefault();
            const proximo = evento.key === "Home" ? 0 : evento.key === "End" ? botoes.length - 1
              : Math.max(0, Math.min(botoes.length - 1, atual + (evento.key === "ArrowRight" ? 1 : -1)));
            botoes[proximo]?.focus({ preventScroll: true });
            botoes[proximo]?.scrollIntoView({ block: "nearest", inline: "nearest" });
          }}
          onPointerDown={(evento) => {
            suprimirClique.current = false;
            if (evento.pointerType !== "mouse" || evento.button !== 0) return;
            arraste.current = { x: evento.clientX, scroll: evento.currentTarget.scrollLeft, moveu: false };
          }}
          onPointerMove={(evento) => {
            const gesto = arraste.current;
            if (!gesto) return;
            const distancia = evento.clientX - gesto.x;
            if (Math.abs(distancia) > 6) gesto.moveu = true;
            if (gesto.moveu) {
              evento.currentTarget.setPointerCapture(evento.pointerId);
              evento.currentTarget.scrollLeft = gesto.scroll - distancia;
              suprimirClique.current = true;
            }
          }}
          onPointerUp={() => { arraste.current = null; }}
          onPointerCancel={() => { arraste.current = null; suprimirClique.current = false; }}
          onPointerLeave={() => { arraste.current = null; }}
          onClickCapture={(evento) => {
            if (suprimirClique.current) { evento.preventDefault(); evento.stopPropagation(); suprimirClique.current = false; }
          }}>
          {grupo.itens.map((obra, indice) => (
            <li key={obra.id} className={estilos.livro} data-vitrine={indice === 0 || undefined}
              onTransitionEnd={(evento) => {
                if (evento.target === evento.currentTarget && evento.propertyName === "width"
                  && evento.currentTarget.contains(document.activeElement)) {
                  evento.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
                }
              }}
              style={{ "--cor-lombada": CORES[obra.id % CORES.length],
                "--altura-livro": `${224 + (obra.id % 5) * 9}px`,
                "--largura-lombada": `${larguraDaLombada(obra.id)}px` } as CSSProperties}>
              <button type="button" className={estilos.volume} aria-label={t("abrir", { titulo: obra.titulo })}
                aria-haspopup="dialog" onClick={() => aoAbrir(obra.id)}>
                <span className={estilos.lombada} aria-hidden>
                  {obra.capa && <ImagemDaColecao key={obra.capa} src={obra.capa} sizes="56px" className={estilos.recorte} />}
                  <span className={estilos.selo}>既読</span>
                  <span className={estilos.tituloLombada}>{obra.titulo}</span>
                  <span className={estilos.marca}>✦</span>
                </span>
                <span className={estilos.capa} aria-hidden>
                  {obra.capa && <ImagemDaColecao key={obra.capa} src={obra.capa} sizes="180px" />}
                  <span className={estilos.tituloCapa}>{obra.titulo}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className={estilos.base} aria-hidden />
      </div>
    </section>
  );
}

function ImagemDaColecao({ src, sizes, className }: { src: string; sizes: string; className?: string })
{
  const [falhou, setFalhou] = useState(false);
  if (falhou) return null;
  return <Image src={src} alt="" fill sizes={sizes} unoptimized draggable={false}
    className={className} onError={() => setFalhou(true)} />;
}

function DetalheDaColecao({ item, aoFechar, focoAlternativo }: {
  item: ItemDaColecao;
  aoFechar: () => void;
  focoAlternativo: RefObject<HTMLButtonElement | null>;
})
{
  const t = useTranslations("colecao");
  const dialogo = useRef<HTMLDialogElement>(null);
  const tituloId = useId();

  useEffect(() => {
    const elemento = dialogo.current;
    const origem = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const alternativa = focoAlternativo.current;
    const overflow = document.body.style.overflow;
    elemento?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      elemento?.close();
      document.body.style.overflow = overflow;
      const destino = origem?.isConnected ? origem : alternativa;
      destino?.focus({ preventScroll: true });
    };
  }, [focoAlternativo]);

  return (
    <dialog ref={dialogo} className={estilos.dialogo} aria-labelledby={tituloId}
      onKeyDown={(evento) => {
        const interno = evento.currentTarget.querySelector<HTMLElement>('[aria-modal="true"]');
        // A confirmação existente ouve Escape no document. Evita que o mesmo
        // Escape também acione o fechamento nativo deste painel.
        if (evento.key === "Escape" && interno) { evento.preventDefault(); return; }
        if (evento.key !== "Tab") return;
        const raiz = interno ?? evento.currentTarget;
        const focaveis = Array.from(raiz.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]',
        )).filter((elemento) => elemento.tabIndex >= 0 && !elemento.matches(":disabled") && elemento.getClientRects().length > 0);
        const primeiro = focaveis[0];
        const ultimo = focaveis.at(-1);
        if (evento.shiftKey && (document.activeElement === primeiro || !raiz.contains(document.activeElement))) {
          evento.preventDefault(); ultimo?.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault(); primeiro?.focus();
        }
      }}
      onCancel={(evento) => {
        // O reset já tem sua própria confirmação; Escape fecha só a camada interna.
        evento.preventDefault();
        if (!evento.currentTarget.querySelector('[aria-modal="true"]')) aoFechar();
      }}
      onClick={(evento) => { if (evento.target === evento.currentTarget) aoFechar(); }}>
      <div className={estilos.painel}>
        <header className={estilos.topoPainel}>
          <p id={tituloId}>{t("detalhes", { titulo: item.titulo })}</p>
          <button type="button" onClick={aoFechar} aria-label={t("fechar")}>✕</button>
        </header>
        <ul className={estilos.cardDetalhe}>{item.detalhe}</ul>
      </div>
    </dialog>
  );
}

function IconeModo({ prateleira }: { prateleira: boolean })
{
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      {prateleira ? <path d="M3 20h18M5 17V5h4v12M12 17V3h4v14M20 17l-2-9" />
        : <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />}
    </svg>
  );
}
