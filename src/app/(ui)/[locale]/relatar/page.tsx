import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternativasDeIdioma, Link } from "@/i18n/navigation";
import { idiomaDoSegmento } from "@/i18n/routing";
import { usuarioDaSessao } from "../../../api/v1/_shared/sessao";
import { FormularioDeRelato } from "./formulario";

// Depende da sessão: nunca pré-renderizada.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/relatar">): Promise<Metadata>
{
  const { locale } = await params;
  const t = await getTranslations({ locale: idiomaDoSegmento(locale), namespace: "relatar" });

  return { title: t("meta.titulo"), alternates: alternativasDeIdioma("/relatar") };
}

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** O `?de=` só serve de contexto no relato; o domínio recusa o que não for caminho nosso. */
function primeiro(valor: string | string[] | undefined): string
{
  if (typeof valor === "string")
  {
    return valor;
  }

  return Array.isArray(valor) && typeof valor[0] === "string" ? valor[0] : "";
}

export default async function Relatar({ params, searchParams }: Props)
{
  const { locale } = await params;
  const idioma = idiomaDoSegmento(locale);
  const t = await getTranslations("relatar");
  const userId = await usuarioDaSessao();
  const rota = primeiro((await searchParams).de);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-marca text-3xl font-bold tracking-tight">{t("titulo")}</h1>
        <p className="text-texto-suave">{t("subtitulo")}</p>
      </header>

      {/* O aviso vem ANTES de escrever, não depois: o texto vira issue pública. */}
      <p className="rounded-md border border-borda bg-superficie p-4 text-sm">
        {t("avisoPublico")}
      </p>

      {userId === null ? (
        <p className="text-sm">
          {t("precisaEntrar")}{" "}
          <Link href="/entrar" className="underline underline-offset-4">
            {t("entrar")}
          </Link>
        </p>
      ) : (
        <FormularioDeRelato rota={rota} idioma={idioma} />
      )}
    </main>
  );
}
