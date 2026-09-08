import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ColecaoVisual } from "../../componentes/colecao-visual";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Amostra fixa de metadados públicos já presentes no cache do projeto.
// Não consulta o banco, não usa uma conta e nunca altera a coleção de alguém.
const AMOSTRA = [
  [105778, "Chainsaw Man", "bx105778-euxXZEIfDY2u.png"],
  [30002, "Berserk", "bx30002-Cul4OeN7bYtn.jpg"],
  [30013, "ONE PIECE", "bx30013-BeslEMqiPhlk.jpg"],
  [30642, "Vinland Saga", "bx30642-0mjRDkf4THpo.jpg"],
  [30656, "Vagabond", "bx30656-9mW113O7rDnA.png"],
  [34632, "Oyasumi Punpun", "bx34632-5xMDkx3pXsEh.png"],
  [46765, "Kingdom", "nx46765-KPXir4sRqJBW.png"],
  [53390, "Shingeki no Kyojin", "bx53390-1RsuABC34P9D.jpg"],
  [63327, "Tokyo Ghoul", "bx63327-glC9cDxYBja9.png"],
  [74347, "One Punch-Man", "bx74347-sZpmNJ5xLwRK.jpg"],
  [108556, "SPY×FAMILY", "bx108556-NHjkz0BNJhLx.jpg"],
  [85486, "Boku no Hero Academia", "bx85486-INqnYx8gL3eX.jpg"],
  [87216, "Kimetsu no Yaiba", "bx87216-c9bSNVD10UuD.png"],
  [101517, "Jujutsu Kaisen", "bx101517-H3TdM3g5ZUe9.jpg"],
  [105398, "Na Honjaman Level Up", "bx105398-b673Vt5ZSuz3.jpg"],
] as const;

export default async function LaboratorioPrateleira()
{
  if (process.env.NODE_ENV !== "development") notFound();
  const t = await getTranslations("colecao");
  const itens = AMOSTRA.map(([id, titulo, arquivo]) => {
    const capa = `https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/${arquivo}`;
    return {
      id, titulo, capa,
      detalhe: (
        <li className="flex gap-4 rounded-lg border border-borda bg-superficie p-4">
          <Link href={`/obra/${id}`} className="shrink-0">
            <Image src={capa} alt="" width={96} height={144} unoptimized className="h-36 w-24 rounded object-cover" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h2 className="font-medium">{titulo}</h2>
            <p className="text-xs text-texto-suave">{t("avisoLaboratorio")}</p>
            <Link href={`/obra/${id}`} className="mt-auto text-sm text-acento underline underline-offset-4">{t("verObra")}</Link>
          </div>
        </li>
      ),
    };
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-9 px-6 py-12">
      <header className="flex flex-col gap-4">
        <p className="text-xs tracking-wide text-acento">{t("avisoLaboratorio")}</p>
        <h1 className="font-marca text-4xl font-bold tracking-tight sm:text-5xl">{t("laboratorio")}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-texto-suave">{t("descricaoLaboratorio")}</p>
      </header>
      <ColecaoVisual itens={itens} titulo={t("laboratorio")} inicial="prateleira" grupos={[
        { id: "descobrir", titulo: t("selecao"), itens: itens.slice(0, 10) },
        { id: "guardar", titulo: t("favoritos"), itens: itens.slice(10) },
      ]} />
    </main>
  );
}
