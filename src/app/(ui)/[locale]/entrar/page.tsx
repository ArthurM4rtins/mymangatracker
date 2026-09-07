import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { alternativasDeIdioma, Link } from "@/i18n/navigation";
import { FormularioDeLogin } from "./formulario";
import { idiomaDoSegmento } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/entrar">): Promise<Metadata>
{
  const { locale } = await params;
  const t = await getTranslations({ locale: idiomaDoSegmento(locale), namespace: "entrar" });

  return { title: t("meta.titulo"), alternates: alternativasDeIdioma("/entrar") };
}

type Props = {
  searchParams: Promise<{ conta?: string }>;
};

export default async function Entrar({ searchParams }: Props)
{
  const { conta } = await searchParams;
  const t = await getTranslations("entrar");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">{t("titulo")}</h1>
        {conta === "criada" ? (
          <p role="status" className="rounded-md border border-borda bg-superficie p-3 text-sm">
            {t("contaCriada")}
          </p>
        ) : (
          <p className="text-texto-suave">{t("subtitulo")}</p>
        )}
      </header>

      <FormularioDeLogin />

      <p className="text-sm text-texto-suave">
        {t.rich("semConta", {
          link: function (partes)
          {
            return (
              <Link href="/cadastrar" className="text-acento underline underline-offset-4">
                {partes}
              </Link>
            );
          },
        })}
      </p>
    </main>
  );
}
