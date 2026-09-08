"use client";

/**
 * O desfazer da extensão (#172): apaga o histórico de leitura desta obra e
 * zera o progresso, para a pessoa marcar de novo o capítulo certo.
 *
 * Confirmação com número — quantas aberturas somem e onde o progresso está
 * hoje —, no modal do site (padrão de `botao-sair.tsx`), nunca `confirm()`.
 * O foco nasce no Cancelar: resetar é o caminho que custa.
 */
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useRouter } from "@/i18n/navigation";

export function ResetarLeitura({
  entradaId,
  titulo,
  totalDeAberturas,
  progressChapter,
}: {
  entradaId: string;
  titulo: string;
  totalDeAberturas: number;
  progressChapter: string | null;
})
{
  const roteador = useRouter();
  const t = useTranslations("obra");
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function resetar()
  {
    setOcupado(true);
    setErro(null);
    try
    {
      const resposta = await fetch(`/api/v1/estante/${entradaId}/leituras`, { method: "DELETE" });

      if (!resposta.ok)
      {
        setErro(t("reset.erro"));
        return;
      }

      setConfirmando(false);
      roteador.refresh();
    }
    catch
    {
      setErro(t("reset.erro"));
    }
    finally
    {
      setOcupado(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={function () { setConfirmando(true); }}
        className="w-fit text-xs text-texto-suave underline decoration-dotted underline-offset-4 hover:text-acento"
      >
        {t("reset.botao")}
      </button>

      {confirmando && (
        <ConfirmarReset
          titulo={titulo}
          totalDeAberturas={totalDeAberturas}
          progressChapter={progressChapter}
          ocupado={ocupado}
          erro={erro}
          aoConfirmar={function () { void resetar(); }}
          aoCancelar={function () { setConfirmando(false); setErro(null); }}
        />
      )}
    </>
  );
}

function ConfirmarReset({
  titulo,
  totalDeAberturas,
  progressChapter,
  ocupado,
  erro,
  aoConfirmar,
  aoCancelar,
}: {
  titulo: string;
  totalDeAberturas: number;
  progressChapter: string | null;
  ocupado: boolean;
  erro: string | null;
  aoConfirmar: () => void;
  aoCancelar: () => void;
})
{
  const t = useTranslations("obra");
  const c = useTranslations("comum");
  const cancelar = useRef<HTMLButtonElement>(null);

  useEffect(function ()
  {
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
      aria-label={t("reset.titulo", { titulo })}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div aria-hidden onClick={aoCancelar} className="absolute inset-0 bg-black/60" />

      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-lg border border-borda bg-superficie p-5 shadow-xl">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium">{t("reset.titulo", { titulo })}</h2>
          <p className="text-sm text-texto-suave">
            {t("reset.texto", { n: totalDeAberturas })}
            {progressChapter !== null && (
              <>
                {" "}
                {t("reset.hoje", { capitulo: progressChapter })}
              </>
            )}
          </p>
          <p className="text-sm text-texto-suave">{t("reset.depois")}</p>
        </div>

        {erro && (
          <p role="alert" className="text-xs text-erro">
            {erro}
          </p>
        )}

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
            {ocupado ? t("reset.resetando") : t("reset.confirmar")}
          </button>
        </div>
      </div>
    </div>
  );
}
