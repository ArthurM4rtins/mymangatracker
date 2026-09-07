import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { alternativasDeIdioma, Link } from "@/i18n/navigation";
import { FormularioDeCadastro } from "./formulario";
import { idiomaDoSegmento } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/cadastrar">): Promise<Metadata>
{
  const { locale } = await params;
  const t = await getTranslations({ locale: idiomaDoSegmento(locale), namespace: "cadastrar" });

  return { title: t("meta.titulo"), alternates: alternativasDeIdioma("/cadastrar") };
}

export default async function Cadastrar()
{
  const t = await getTranslations("cadastrar");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">{t("titulo")}</h1>
        <p className="text-texto-suave">{t("subtitulo")}</p>
      </header>

      <FormularioDeCadastro />

      <p className="text-sm text-texto-suave">
        {t.rich("jaTemConta", {
          link: function (partes)
          {
            return (
              <Link href="/entrar" className="text-acento underline underline-offset-4">
                {partes}
              </Link>
            );
          },
        })}
      </p>
    </main>
  );
}
