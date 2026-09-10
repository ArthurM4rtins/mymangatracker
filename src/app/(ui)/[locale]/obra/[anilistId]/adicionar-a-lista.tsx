"use client";

/**
 * O botão de listas da página da obra (#244): um menu ancorado, no mesmo molde
 * do seletor de idioma do cabeçalho — botão, painel flutuante, fecha no Escape
 * e no clique fora. Antes o painel abria DENTRO da linha e empurrava o layout,
 * e o gatilho era um link sublinhado ao lado de um botão contornado.
 *
 * Marcar põe (POST) e desmarcar tira (DELETE). Dois verbos, não um alterna
 * (#237): a tela sabe o estado e pede o que quer.
 *
 * Aqui só se marca lista que já existe. Criar lista continua na página de
 * Listas, que é onde ela também se edita e se apaga.
 */
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";

type MinhaLista = {
  listaId: string;
  nome: string;
  jaContem: boolean;
};

export function AdicionarALista({ anilistId }: { anilistId: number })
{
  const t = useTranslations("obra");
  const roteador = useRouter();
  const [aberto, setAberto] = useState(false);
  const [listas, setListas] = useState<MinhaLista[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // Em voo (#148, item 13): um clique por vez, para o estado local não
  // atropelar a resposta que ainda não chegou.
  const [emVoo, setEmVoo] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const painelId = useId();

  // Fechar no clique fora e no Escape. Sem isso o menu fica preso aberto no
  // celular, onde não existe "clicar fora" com o teclado.
  useEffect(function ()
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
  }, [aberto]);

  async function abrir()
  {
    setAberto(true);
    setErro(null);

    try
    {
      const resposta = await fetch(`/api/v1/listas?anilistId=${anilistId}`);

      if (resposta.status === 401)
      {
        roteador.push("/entrar");
        return;
      }

      if (!resposta.ok)
      {
        setErro(t("erros.listas"));
        return;
      }

      const corpo = await resposta.json();
      setListas(corpo.listas);
    }
    catch
    {
      setErro(t("erros.rede"));
    }
  }

  async function alternar(lista: MinhaLista)
  {
    if (emVoo !== null)
    {
      return;
    }

    setEmVoo(lista.listaId);
    setErro(null);

    try
    {
      const resposta = await fetch(`/api/v1/listas/${lista.listaId}/itens`, {
        method: lista.jaContem ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anilistId }),
      });

      if (!resposta.ok)
      {
        setErro(t("erros.salvar"));
        return;
      }

      const contem = !lista.jaContem;
      setListas(function (atuais)
      {
        return (atuais ?? []).map(function (item)
        {
          return item.listaId === lista.listaId
            ? { ...item, jaContem: contem }
            : item;
        });
      });
    }
    catch
    {
      setErro(t("erros.rede"));
    }
    finally
    {
      setEmVoo(null);
    }
  }

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={function () { if (aberto) { setAberto(false); } else { void abrir(); } }}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="rounded-md border border-borda px-3 py-1.5 text-sm font-medium text-texto-suave transition-colors hover:border-acento hover:text-acento"
      >
        {t("listas.botao")}
      </button>

      {aberto && (
        <div
          id={painelId}
          className="absolute left-0 top-full z-20 mt-1.5 w-60 overflow-hidden rounded-md border border-borda bg-superficie shadow-lg"
        >
          <p className="border-b border-borda px-3 py-2 text-xs uppercase tracking-wide text-texto-suave">
            {t("listas.titulo")}
          </p>

          {erro && (
            <p role="alert" className="px-3 py-2 text-xs text-texto-suave">
              {erro}
            </p>
          )}

          {listas === null && erro === null && (
            <p className="px-3 py-2 text-xs text-texto-suave">
              {t("listas.carregando")}
            </p>
          )}

          {listas !== null && listas.length === 0 && (
            <p className="px-3 py-2 text-xs leading-relaxed text-texto-suave">
              {t.rich("listas.vazia", {
                link: function (partes)
                {
                  return (
                    <Link href="/listas" className="text-acento underline underline-offset-4">
                      {partes}
                    </Link>
                  );
                },
              })}
            </p>
          )}

          {listas !== null && listas.length > 0 && (
            <ul className="max-h-64 overflow-y-auto py-1">
              {listas.map(function (lista)
              {
                return (
                  <li key={lista.listaId}>
                    <button
                      type="button"
                      onClick={function () { void alternar(lista); }}
                      disabled={emVoo !== null}
                      aria-pressed={lista.jaContem}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-fundo disabled:opacity-60"
                    >
                      <span
                        aria-hidden
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-[10px] leading-none transition-colors ${
                          lista.jaContem
                            ? "border-acento bg-acento text-acento-contraste"
                            : "border-borda"
                        }`}
                      >
                        {lista.jaContem ? "✓" : ""}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{lista.nome}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
