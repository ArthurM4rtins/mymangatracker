"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getPathname, usePathname } from "@/i18n/navigation";
import { routing, type Idioma } from "@/i18n/routing";

/**
 * O nome do idioma, escrito NO próprio idioma ("English", "Português (Brasil)",
 * "日本語"), vem do `Intl.DisplayNames` do navegador.
 *
 * Guardar esses nomes no catálogo custaria caro de um jeito escondido: cada
 * arquivo de idioma teria que nomear TODOS os idiomas, então entrar com o
 * terceiro obrigaria a editar os dois que já existem. Nove chaves para três
 * nomes, e crescendo ao quadrado.
 */
function nomeDoIdioma(idioma: string): string
{
  const nome = new Intl.DisplayNames([idioma], { type: "language" }).of(idioma) ?? idioma;

  // Português devolve minúsculo ("português (Brasil)"); é rótulo, começa em maiúscula.
  return nome.charAt(0).toLocaleUpperCase(idioma) + nome.slice(1);
}

export function SeletorIdioma({ logado }: { logado: boolean })
{
  const idiomaAtivo = useLocale();
  const caminho = usePathname();
  const busca = useSearchParams();
  const [aberto, setAberto] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const t = useTranslations("cabecalho");

  // Fechar clicando fora e no Escape. Sem isso a lista fica presa aberta no
  // celular, onde não existe "clicar fora" com o teclado.
  useEffect(
    function ()
    {
      if (!aberto)
      {
        return;
      }

      function aoClicarFora(evento: PointerEvent)
      {
        if (caixa.current !== null && !caixa.current.contains(evento.target as Node))
        {
          setAberto(false);
        }
      }

      function aoTeclar(evento: KeyboardEvent)
      {
        if (evento.key === "Escape")
        {
          setAberto(false);
        }
      }

      document.addEventListener("pointerdown", aoClicarFora);
      document.addEventListener("keydown", aoTeclar);

      return function ()
      {
        document.removeEventListener("pointerdown", aoClicarFora);
        document.removeEventListener("keydown", aoTeclar);
      };
    },
    [aberto],
  );

  async function trocar(idioma: Idioma)
  {
    if (idioma === idiomaAtivo)
    {
      setAberto(false);
      return;
    }

    setTrocando(true);

    // Quem está logado leva a escolha para a conta, e não só para este
    // navegador (#116, fase 5). A resposta reescreve o cookie, então o próximo
    // aparelho pega o idioma certo no login. Falha de rede não trava a troca:
    // o cookie que o next-intl escreve já resolve esta visita.
    if (logado)
    {
      try
      {
        await fetch("/api/v1/perfil", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: idioma }),
        });
      }
      catch
      {
        // segue a troca mesmo assim
      }
    }

    // `usePathname` do next-intl devolve o caminho SEM o prefixo; `getPathname`
    // recoloca o do idioma pedido. A query segue junto para o filtro não sumir.
    const consulta = busca.toString();
    const destino = getPathname({ href: caminho, locale: idioma });

    // Recarga de documento, não navegação de cliente, DE PROPÓSITO: trocar o
    // idioma muda o `lang` do <html>, o React re-renderiza o elemento e leva
    // junto o `data-theme` que o script inline do layout tinha posto ali —
    // o tema escolhido voltava para o padrão a cada troca de idioma
    // (`suppressHydrationWarning` só vale na hidratação, não em update).
    // Recarregando, o script roda de novo e relê o tema do localStorage.
    window.location.assign(consulta === "" ? destino : `${destino}?${consulta}`);
  }

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={function ()
        {
          setAberto(!aberto);
        }}
        disabled={trocando}
        aria-expanded={aberto}
        aria-haspopup="true"
        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm text-texto-suave transition-colors hover:text-texto disabled:opacity-60"
      >
        {t("idioma")}
        <Seta aberta={aberto} />
      </button>

      {aberto && (
        <ul className="absolute right-0 top-full z-10 mt-1 min-w-max overflow-hidden rounded-md border border-borda bg-superficie py-1 shadow-lg">
          {routing.locales.map(function (idioma)
          {
            const selecionado = idioma === idiomaAtivo;

            return (
              <li key={idioma}>
                <button
                  type="button"
                  lang={idioma}
                  onClick={function ()
                  {
                    void trocar(idioma);
                  }}
                  disabled={trocando}
                  aria-current={selecionado}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors disabled:opacity-60 ${
                    selecionado
                      ? "text-texto"
                      : "text-texto-suave hover:bg-borda/40 hover:text-texto"
                  }`}
                >
                  <span className="w-3.5 shrink-0 text-acento">
                    {selecionado && <Visto />}
                  </span>
                  {nomeDoIdioma(idioma)}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Seta({ aberta }: { aberta: boolean })
{
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform ${aberta ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function Visto()
{
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
