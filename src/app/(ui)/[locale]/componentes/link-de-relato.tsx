"use client";

/**
 * O link do rodapé para relatar erro de tradução (issue #158).
 *
 * Cliente por um motivo só: precisa saber em que tela a pessoa estava, e o
 * layout do servidor não sabe a rota. O caminho vai no `?de=`, e o domínio
 * recusa o que não for caminho do próprio site — então isto é conveniência para
 * quem lê o relato, nunca dado em que se confia.
 */
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { Link } from "@/i18n/navigation";

export function LinkDeRelato()
{
  const t = useTranslations("relatar");
  const rota = usePathname();

  return (
    <Link
      href={{ pathname: "/relatar", query: { de: rota } }}
      className="underline underline-offset-4"
    >
      {t("linkDoRodape")}
    </Link>
  );
}
