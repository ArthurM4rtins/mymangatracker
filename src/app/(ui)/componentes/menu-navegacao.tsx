"use client";

/**
 * O menu único do header: navegação, tema e sessão num dropdown só.
 * Fecha com Esc, clique fora e depois de navegar. O que aparece depende de
 * `logado` — quem resolve a sessão é o layout (server), aqui só se apresenta.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotaoSair } from "./botao-sair";
import { SeletorTema } from "./seletor-tema";

export function MenuNavegacao({ logado }: { logado: boolean })
{
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(function ()
  {
    if (!aberto)
    {
      return;
    }

    function aoTeclar(evento: KeyboardEvent)
    {
      if (evento.key === "Escape")
      {
        setAberto(false);
      }
    }

    function aoClicarFora(evento: PointerEvent)
    {
      if (raiz.current && !raiz.current.contains(evento.target as Node))
      {
        setAberto(false);
      }
    }

    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("pointerdown", aoClicarFora);

    return function ()
    {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("pointerdown", aoClicarFora);
    };
  }, [aberto]);

  function fechar()
  {
    setAberto(false);
  }

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={function () { setAberto(!aberto); }}
        aria-expanded={aberto}
        aria-haspopup="true"
        aria-label="Menu"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-borda text-texto-suave transition-colors hover:text-texto"
      >
        <IconeMenu />
      </button>

      {aberto && (
        <div className="absolute right-0 top-11 z-10 flex w-56 flex-col gap-3 rounded-lg border border-borda bg-superficie p-3 shadow-lg">
          <nav aria-label="Navegação" className="flex flex-col">
            <ItemDeMenu href="/catalogo" aoNavegar={fechar}>
              Catálogo
            </ItemDeMenu>
            <ItemDeMenu href="/listas" aoNavegar={fechar}>
              Listas
            </ItemDeMenu>
            {logado && (
              <ItemDeMenu href="/estante" aoNavegar={fechar}>
                Estante
              </ItemDeMenu>
            )}
          </nav>

          <div className="flex flex-col gap-2 border-t border-borda pt-3">
            <span className="px-2 text-xs uppercase tracking-wide text-texto-suave">
              Tema
            </span>
            <div className="px-2">
              <SeletorTema />
            </div>
          </div>

          <div className="flex border-t border-borda pt-3">
            {logado ? (
              <span className="px-2">
                <BotaoSair />
              </span>
            ) : (
              <ItemDeMenu href="/entrar" aoNavegar={fechar}>
                Entrar
              </ItemDeMenu>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemDeMenu({
  href,
  aoNavegar,
  children,
}: {
  href: string;
  aoNavegar: () => void;
  children: React.ReactNode;
})
{
  return (
    <Link
      href={href}
      onClick={aoNavegar}
      className="rounded-md px-2 py-1.5 text-sm text-texto-suave transition-colors hover:bg-fundo hover:text-texto"
    >
      {children}
    </Link>
  );
}

function IconeMenu()
{
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M2 4h12M2 8h12M2 12h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
