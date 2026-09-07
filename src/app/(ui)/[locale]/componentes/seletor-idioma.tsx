"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { getPathname, usePathname } from "@/i18n/navigation";
import { routing, type Idioma } from "@/i18n/routing";

/**
 * A sigla do botão sai do próprio código do idioma: `pt-BR` → PT, `en` → EN,
 * `ja` → JA. Um mapa fixo aqui obrigaria a lembrar dele a cada idioma novo, e
 * esquecer só apareceria como `es` minúsculo no header, sem quebrar nada.
 */
function sigla(idioma: string): string
{
  return idioma.split("-")[0].toUpperCase();
}

/**
 * O nome do idioma, escrito NO próprio idioma ("English", "português (Brasil)",
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
  const [trocando, setTrocando] = useState(false);
  const t = useTranslations("cabecalho");

  async function trocar(idioma: Idioma)
  {
    if (idioma === idiomaAtivo)
    {
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
    <div role="group" aria-label={t("idioma")} className="flex items-center gap-1">
      {routing.locales.map(function (idioma)
      {
        const selecionado = idioma === idiomaAtivo;

        return (
          <button
            key={idioma}
            type="button"
            lang={idioma}
            onClick={function ()
            {
              void trocar(idioma);
            }}
            disabled={trocando}
            aria-pressed={selecionado}
            title={nomeDoIdioma(idioma)}
            className={`rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-60 ${
              selecionado
                ? "text-texto"
                : "text-texto-suave hover:text-texto"
            }`}
          >
            {sigla(idioma)}
          </button>
        );
      })}
    </div>
  );
}
