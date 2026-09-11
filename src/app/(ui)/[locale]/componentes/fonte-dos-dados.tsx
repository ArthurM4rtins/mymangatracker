"use client";

/**
 * De qual fonte o catálogo está vindo agora (#251).
 *
 * Antes isso era um aviso na cara de qualquer visitante do catálogo, dizendo
 * que o AniList estava fora. Estado da nossa infraestrutura não é assunto de
 * quem só quer procurar um mangá — mas é assunto de quem cuida do sistema, e o
 * lugar dele é o rodapé, quieto.
 *
 * **Só para quem está logado**, e não por capricho: a #148 (item 12) decidiu
 * que o corpo anônimo do health não lista dependências, justamente para não
 * publicar estado de configuração. Este indicador respeita a mesma linha — quem
 * o renderiza já checou a sessão.
 *
 * Cliente e depois da montagem, nunca no render do servidor: o rodapé está no
 * layout, então uma sonda ali atrasaria TODA página, e ainda mais quando a
 * fonte está fora e a chamada espera o tempo limite.
 */
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Fonte = "anilist" | "kitsu" | "desconhecida";

export function FonteDosDados()
{
  const t = useTranslations("rodape.fonte");
  const [fonte, setFonte] = useState<Fonte>("desconhecida");

  useEffect(function ()
  {
    let vivo = true;

    async function medir()
    {
      try
      {
        const resposta = await fetch("/api/v1/health");
        const corpo = await resposta.json();
        const kitsu = (corpo.dependencies ?? []).find(function (dependencia: { name?: string })
        {
          return dependencia.name === "kitsu";
        });
        const anilist = (corpo.dependencies ?? []).find(function (dependencia: { name?: string })
        {
          return dependencia.name === "anilist";
        });

        if (!vivo)
        {
          return;
        }

        setFonte(kitsu?.status === "ok" ? "kitsu" : anilist?.status === "ok" ? "anilist" : "desconhecida");
      }
      catch
      {
        // Sem resposta, o indicador simplesmente não aparece. É um informativo
        // do rodapé; não vale poluir a tela com o erro dele mesmo.
      }
    }

    void medir();

    return function () { vivo = false; };
  }, []);

  if (fonte === "desconhecida")
  {
    return null;
  }

  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          fonte === "kitsu" ? "bg-acento" : "bg-texto-suave"
        }`}
      />
      {t("agora", { fonte: fonte === "anilist" ? "AniList" : "Kitsu" })}
    </li>
  );
}
