import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { alternativasDeIdioma } from "@/i18n/navigation";
import { idiomaDoSegmento } from "@/i18n/routing";
import { perfilDoUsuarioDoSistema } from "@/server/services/usuario.service";
import { usuarioDaSessao } from "../../../api/v1/_shared/sessao";
import { ApagarConta } from "./apagar-conta";

// Depende da sessão: nunca pré-renderizada.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/conta">): Promise<Metadata>
{
  const { locale } = await params;
  const t = await getTranslations({ locale: idiomaDoSegmento(locale), namespace: "conta" });

  return { title: t("meta.titulo"), alternates: alternativasDeIdioma("/conta") };
}

export default async function Conta()
{
  const t = await getTranslations("conta");
  const userId = await usuarioDaSessao();

  if (userId === null)
  {
    redirect("/entrar");
  }

  const usuario = await perfilDoUsuarioDoSistema(userId);

  if (usuario === null)
  {
    redirect("/entrar");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">{t("titulo")}</h1>
        <p className="text-texto-suave">{t("subtitulo")}</p>
      </header>

      <section className="flex flex-col gap-4 rounded-md border border-nota p-4">
        <h2 className="text-lg font-medium">{t("apagar.titulo")}</h2>

        {/* O que some vem ANTES do campo. Depois de apagar não há para onde voltar. */}
        <p className="text-sm text-texto-suave">{t("apagar.oQueSome")}</p>
        <p className="text-sm text-texto-suave">{t("apagar.nomeLivre")}</p>

        <ApagarConta username={usuario.username} />
      </section>
    </main>
  );
}
