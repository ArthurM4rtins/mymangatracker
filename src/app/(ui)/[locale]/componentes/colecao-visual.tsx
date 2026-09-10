"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

import {
  emAndaresDosGrupos,
  LARGURA_ABERTA,
  larguraDaLombada,
  larguraDaVitrine,
  RECUO_DO_TRILHO,
  VAO,
} from "./andares";
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
  /** Quanto o livro aberto ocupa neste andar. Sem isso, a largura padrão. */
  larguraDaVitrine?: number;
  /** No modo estante, o andar que leva o nome do grupo na tela. */
  abreOGrupo?: boolean;
};

const CORES = ["#733c35", "#344d53", "#586044", "#71516b", "#865f33", "#364868", "#55504a"];

/** Quanto o dedo precisa ficar parado para o gesto virar reordenar, e não rolar. */
const ESPERA_DO_TOQUE_MS = 400;
/** A partir de quantos pixels o gesto do mouse deixa de ser clique e vira arraste. */
const ARRASTE_MINIMO = 6;

export function ColecaoVisual({ itens, grupos, titulo, inicial = "prateleira", classeGrade = "grid gap-4 sm:grid-cols-2", andarSimples = false, maximoPorAndar, aoReordenar }: {
  itens: ItemDaColecao[];
  grupos?: GrupoDaColecao[];
  titulo: string;
  /** A prateleira é o que o Kidoku tem de próprio: ela abre por padrão (#241). */
  inicial?: "grade" | "prateleira";
  classeGrade?: string;
   /**
   * Andares simples: a coleção vira uma estante de verdade. A prateleira mede
   * a própria largura e enche cada andar com o que cabe; não tem número, nem
   * contagem, nem setas, os andares ficam colados, e o trilho não rola — a
   * vitrine fecha quando outro livro abre, então a largura total não muda.
   *
   * Com `grupos` de nome próprio (a estante por status), cada grupo rende
   * quantos andares couberem e o nome fica em cima do primeiro (#234). Sem
   * grupos, o nome do andar existe só para o leitor de tela.
   */
  andarSimples?: boolean;
  /** Teto de obras por andar no modo simples, se a tela quiser um (a home usa 9). */
  maximoPorAndar?: number;
  /**
   * Quando existe, arrastar um livro reordena a coleção (#242): `destino` é o
   * índice que a obra passa a ocupar na ordem final. Só a lista de quem é dono
   * passa isto; nas demais telas a prateleira segue sem arraste.
   */
  aoReordenar?: (id: number, destino: number) => void;
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

  const arraste = useArrasteParaOrdenar(estante, itens, aoReordenar);

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

  // Sem grupo de nome próprio, o "grupo" é a coleção inteira e o título fica
  // só para o leitor de tela.
  const comNomeProprio = grupos !== undefined;
  const paraFatiar = grupos ?? [{ id: "colecao", titulo, itens }];

  const andares: GrupoDaColecao[] = andarSimples
    ? emAndaresDosGrupos(paraFatiar, larguraDoTrilho, maximoPorAndar).map((andar, indice) => ({
      id: andar.id,
      titulo: comNomeProprio ? andar.titulo : t("andar", { n: indice + 1 }),
      itens: andar.itens,
      // O andar com teto fecha cheio apertando a vitrine (#229); os outros
      // ficam com a largura normal.
      larguraDaVitrine: larguraDaVitrine(andar.itens, larguraDoTrilho),
      abreOGrupo: comNomeProprio && andar.abreOGrupo,
    }))
    : paraFatiar;

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
          <div ref={estante} className={estilos.prateleiras} data-simples={andarSimples || undefined}
            data-arrastando={arraste.arrastando || undefined} {...arraste.gestos}>
            <p className={estilos.dica}>{aoReordenar ? t("dicaOrdenavel") : t("dica")}</p>
            {andares.filter((grupo) => grupo.itens.length > 0).map((grupo, indice) => (
              <Prateleira key={grupo.id} grupo={grupo} numero={indice + 1} aoAbrir={setSelecionado}
                simples={andarSimples} selecionado={selecionado} arrastado={arraste.arrastado} />
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

/**
 * O arraste que reordena a coleção (#242).
 *
 * O gesto vive aqui, e não na `Prateleira`, porque quem sabe o índice global de
 * cada obra é a coleção: o andar é só o desenho. Por isso arrastar de um andar
 * para o outro sai de graça — o destino vem do livro sob o ponteiro, achado por
 * `elementFromPoint`, não da posição dentro do andar.
 *
 * A vaga abre ao vivo porque a ordem é reescrita a cada vizinho cruzado: o que
 * se vê antes de soltar já é a prateleira final.
 */
function useArrasteParaOrdenar(
  caixa: RefObject<HTMLDivElement | null>,
  itens: ItemDaColecao[],
  aoReordenar?: (id: number, destino: number) => void,
)
{
  const [arrastado, setArrastado] = useState<number | null>(null);
  const gesto = useRef<{ id: number; x: number; y: number; solto: boolean } | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelarEspera = useCallback(() => {
    if (espera.current !== null) { clearTimeout(espera.current); espera.current = null; }
  }, []);

  const encerrar = useCallback(() => {
    cancelarEspera();
    gesto.current = null;
    setArrastado(null);
  }, [cancelarEspera]);

  /** O id da obra sob o ponteiro, seja qual for o andar. */
  function idSobOPonteiro(x: number, y: number): number | null
  {
    const alvo = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-obra]");
    const id = alvo?.dataset.obra;
    return id === undefined ? null : Number(id);
  }

  function levarPara(destinoId: number)
  {
    const atual = gesto.current;
    if (!atual || destinoId === atual.id) return;
    const destino = itens.findIndex((obra) => obra.id === destinoId);
    if (destino >= 0) aoReordenar?.(atual.id, destino);
  }

  // Enquanto reordena, o dedo não pode rolar a prateleira. `touch-action` não
  // resolve: o valor vale desde o `touchstart`, e a essa altura o gesto já
  // começou. Só um `touchmove` não passivo com `preventDefault` segura.
  useEffect(() => {
    const elemento = caixa.current;
    if (arrastado === null || !elemento) return;
    function segurar(evento: TouchEvent) { evento.preventDefault(); }
    elemento.addEventListener("touchmove", segurar, { passive: false });
    return () => elemento.removeEventListener("touchmove", segurar);
  }, [arrastado, caixa]);

  useEffect(() => cancelarEspera, [cancelarEspera]);

  if (!aoReordenar)
  {
    return { arrastando: false, arrastado: null as number | null, gestos: {} };
  }

  const gestos = {
    onPointerDown(evento: React.PointerEvent<HTMLDivElement>)
    {
      const alvo = (evento.target as HTMLElement).closest<HTMLElement>("[data-obra]");
      const id = alvo?.dataset.obra;
      if (id === undefined || evento.button !== 0) return;

      gesto.current = { id: Number(id), x: evento.clientX, y: evento.clientY, solto: false };

      // No mouse o arraste começa no primeiro movimento: no andar simples não
      // há rolagem para disputar. No toque, arrastar já significa rolar, então
      // só segurar entra no modo de reordenar (#242).
      if (evento.pointerType === "mouse") return;

      const alvoDoToque = evento.currentTarget;
      const ponteiro = evento.pointerId;
      espera.current = setTimeout(() => {
        if (!gesto.current) return;
        alvoDoToque.setPointerCapture(ponteiro);
        navigator.vibrate?.(12);
        setArrastado(gesto.current.id);
      }, ESPERA_DO_TOQUE_MS);
    },
    onPointerMove(evento: React.PointerEvent<HTMLDivElement>)
    {
      const atual = gesto.current;
      if (!atual) return;

      const andou = Math.hypot(evento.clientX - atual.x, evento.clientY - atual.y);

      if (arrastado === null)
      {
        // Dedo que saiu do lugar antes da espera é rolagem, não reordenar.
        if (evento.pointerType !== "mouse")
        {
          if (andou > ARRASTE_MINIMO) { encerrar(); }
          return;
        }

        if (andou <= ARRASTE_MINIMO) return;
        evento.currentTarget.setPointerCapture(evento.pointerId);
        setArrastado(atual.id);
      }

      const destino = idSobOPonteiro(evento.clientX, evento.clientY);
      if (destino !== null) levarPara(destino);
    },
    onPointerUp() { encerrar(); },
    onPointerCancel() { encerrar(); },
    onClickCapture(evento: React.MouseEvent<HTMLDivElement>)
    {
      // O clique que fecha um arraste não pode abrir o painel da obra.
      if (arrastado === null) return;
      evento.preventDefault();
      evento.stopPropagation();
    },
  };

  return { arrastando: arrastado !== null, arrastado, gestos };
}

function Prateleira({ grupo, numero, aoAbrir, simples, selecionado, arrastado }: {
  grupo: GrupoDaColecao;
  numero: number;
  aoAbrir: (id: number) => void;
  simples: boolean;
  /** A obra com o painel aberto, em qualquer andar da coleção. */
  selecionado: number | null;
  /** A obra que está sendo arrastada, em qualquer andar (#242). */
  arrastado: number | null;
})
{
  const t = useTranslations("colecao");
  const trilho = useRef<HTMLUListElement>(null);
  const tituloId = useId();
  const trilhoId = useId();
  const [limites, setLimites] = useState({ inicio: true, fim: true });
  const arraste = useRef<{ x: number; scroll: number; moveu: boolean } | null>(null);
  // Onde o ponteiro desceu. Quem decide se o clique foi arraste é o próprio
  // clique, comparando a sua posição com esta: uma bandeira ligada durante o
  // arraste sobrevive ao gesto que termina fora do trilho — o clique que a
  // apagaria nunca chega, e o clique SEGUINTE é que era engolido (#241).
  const descida = useRef<{ x: number; y: number } | null>(null);

  // Enquanto o painel está aberto, quem fica em evidência é a obra dele: o
  // `showModal` leva o foco embora do livro, e sem isto o andar voltava para o
  // primeiro livro no instante em que o painel abria (#241).
  const emEvidencia = grupo.itens.some((obra) => obra.id === selecionado) ? selecionado : null;

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
    <section aria-labelledby={simples && !grupo.abreOGrupo ? undefined : tituloId}
      aria-label={simples && !grupo.abreOGrupo ? grupo.titulo : undefined}
      className={estilos.secao} data-simples={simples || undefined}
      style={grupo.larguraDaVitrine === undefined
        ? undefined
        : ({ "--largura-aberta": `${grupo.larguraDaVitrine}px` } as CSSProperties)}>
      {simples ? grupo.abreOGrupo && (
        // Nome do grupo e nada mais: sem número, sem contagem, sem setas (#234).
        <h2 id={tituloId} className={estilos.nomeDoGrupo}>{grupo.titulo}</h2>
      ) : (
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
        <ul ref={trilho} id={trilhoId}
          aria-labelledby={simples && !grupo.abreOGrupo ? undefined : tituloId}
          aria-label={simples && !grupo.abreOGrupo ? grupo.titulo : undefined} className={estilos.trilho}
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
            descida.current = { x: evento.clientX, y: evento.clientY };
            if (evento.pointerType !== "mouse" || evento.button !== 0) return;
            arraste.current = { x: evento.clientX, scroll: evento.currentTarget.scrollLeft, moveu: false };
          }}
          onPointerMove={(evento) => {
            const gesto = arraste.current;
            if (!gesto) return;
            const distancia = evento.clientX - gesto.x;
            if (Math.abs(distancia) > ARRASTE_MINIMO) gesto.moveu = true;
            if (gesto.moveu) {
              evento.currentTarget.setPointerCapture(evento.pointerId);
              evento.currentTarget.scrollLeft = gesto.scroll - distancia;
            }
          }}
          onPointerUp={() => { arraste.current = null; }}
          onPointerCancel={() => { arraste.current = null; descida.current = null; }}
          onPointerLeave={() => { arraste.current = null; }}
          onClickCapture={(evento) => {
            const inicio = descida.current;
            descida.current = null;
            // Enter e Espaço também chegam como clique, sem ponteiro nenhum
            // (`detail` zero) — esses nunca são arraste.
            if (!inicio || evento.detail === 0) return;
            if (Math.hypot(evento.clientX - inicio.x, evento.clientY - inicio.y) <= ARRASTE_MINIMO) return;
            evento.preventDefault();
            evento.stopPropagation();
          }}>
          {grupo.itens.map((obra, indice) => (
            <li key={obra.id} className={estilos.livro} data-obra={obra.id}
              data-arrastado={obra.id === arrastado || undefined}
              data-vitrine={(emEvidencia === null ? indice === 0 : obra.id === emEvidencia) || undefined}
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
