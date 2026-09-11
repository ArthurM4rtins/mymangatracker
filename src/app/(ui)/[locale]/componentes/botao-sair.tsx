"use client";

/**
 * Sair apaga o cookie de fato (DELETE /api/v1/sessao), não só redireciona.
 *
 * Confirma antes (#175): o botão é um ícone pequeno no cabeçalho, vizinho de
 * outros controles e presente em toda página — clique errado derruba a sessão.
 * A confirmação é modal do site, nunca `confirm()` do navegador, que não é
 * traduzível nem segue o tema.
 */
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useRouter } from "@/i18n/navigation";

export function BotaoSair()
{
  const roteador = useRouter();
  const [saindo, setSaindo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const t = useTranslations("componentes");

  async function sair()
  {
    setSaindo(true);
    try
    {
      await fetch("/api/v1/sessao", { method: "DELETE" });
      roteador.push("/");
      roteador.refresh();
    }
    finally
    {
      setSaindo(false);
      setConfirmando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={function () { setConfirmando(true); }}
        disabled={saindo}
        aria-label={t("sair")}
        title={t("sair")}
        className="flex h-8 w-8 items-center justify-center rounded-md text-texto-suave transition-colors hover:text-texto disabled:opacity-60"
      >
        <IconeLogout />
      </button>

      {confirmando && (
        <ConfirmarSaida
          ocupado={saindo}
          aoConfirmar={function () { void sair(); }}
          aoCancelar={function () { setConfirmando(false); }}
        />
      )}
    </>
  );
}

function ConfirmarSaida({
  ocupado,
  aoConfirmar,
  aoCancelar,
}: {
  ocupado: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
})
{
  const t = useTranslations("componentes");
  const c = useTranslations("comum");
  const cancelar = useRef<HTMLButtonElement>(null);

  useEffect(function ()
  {
    // O foco nasce no cancelar: sair é o caminho que custa, cancelar é o que
    // não custa nada. Esc faz o mesmo que cancelar, pelo mesmo motivo.
    cancelar.current?.focus();

    function aoTeclar(evento: KeyboardEvent)
    {
      if (evento.key === "Escape")
      {
        aoCancelar();
      }
    }

    document.addEventListener("keydown", aoTeclar);

    return function () { document.removeEventListener("keydown", aoTeclar); };
  }, [aoCancelar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("confirmarSaida.titulo")}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div aria-hidden onClick={aoCancelar} className="absolute inset-0 bg-black/60" />

      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-lg border border-borda bg-superficie p-5 shadow-xl">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium">{t("confirmarSaida.titulo")}</h2>
          <p className="text-sm text-texto-suave">{t("confirmarSaida.pergunta")}</p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            ref={cancelar}
            type="button"
            onClick={aoCancelar}
            className="rounded-md border border-borda px-3 py-1.5 text-sm text-texto-suave transition-colors hover:text-texto"
          >
            {c("cancelar")}
          </button>

          <button
            type="button"
            onClick={aoConfirmar}
            disabled={ocupado}
            className="rounded-md bg-acento px-3 py-1.5 text-sm font-medium text-acento-contraste disabled:opacity-60"
          >
            {ocupado ? t("confirmarSaida.saindo") : t("confirmarSaida.confirmar")}
          </button>
        </div>
      </div>
    </div>
  );
}

function IconeLogout()
{
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
