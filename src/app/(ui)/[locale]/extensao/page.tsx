import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { alternativasDeIdioma, Link } from "@/i18n/navigation";
import { idiomaDoSegmento } from "@/i18n/routing";
import { captura, capturaEmOutroIdioma, type Captura as CapturaDaTela } from "./capturas";
import { LOJA_DA_EXTENSAO } from "./loja";

// Conteúdo puro: não lê banco, não lê sessão, não vai dinâmica.

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/extensao">): Promise<Metadata>
{
  const { locale } = await params;
  const t = await getTranslations({ locale: idiomaDoSegmento(locale), namespace: "extensao" });

  return {
    title: t("meta.titulo"),
    description: t("subtitulo"),
    alternates: alternativasDeIdioma("/extensao"),
  };
}

/** Um passo numerado da instalação. O número é decorativo: a ordem é do `<ol>`. */
function Passo({ numero, children }: { numero: number; children: React.ReactNode })
{
  return (
    <li className="flex gap-4">
      <span
        aria-hidden
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-borda text-sm font-bold text-acento"
      >
        {numero}
      </span>
      <div className="space-y-2 text-sm leading-relaxed text-texto-suave">{children}</div>
    </li>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode })
{
  return (
    <section className="border-t border-borda pt-10">
      <h2 className="font-marca text-xl font-bold tracking-tight">{titulo}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-texto-suave">{children}</div>
    </section>
  );
}

/** Captura de tela da extensão: interface, então o `alt` conta o que se vê. */
function Captura({
  imagem,
  alt,
  legenda,
}: {
  imagem: CapturaDaTela;
  alt: string;
  legenda: string;
})
{
  return (
    <figure className="mt-6">
      <Image
        src={imagem.src}
        alt={alt}
        width={imagem.largura}
        height={imagem.altura}
        className="rounded-md border border-borda"
      />
      <figcaption className="mt-2 text-xs text-texto-suave">{legenda}</figcaption>
    </figure>
  );
}

export default async function Extensao({ params }: PageProps<"/[locale]/extensao">)
{
  const { locale } = await params;
  const idioma = idiomaDoSegmento(locale);
  const t = await getTranslations("extensao");
  // A extensao fala o idioma do NAVEGADOR: quando a captura nao existe no
  // idioma de quem le, a pagina diz isso em vez de fingir que bate.
  const outroIdioma = capturaEmOutroIdioma(idioma);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-10 px-6 py-12">
      <header>
        <h1 className="font-marca text-3xl font-bold tracking-tight">{t("titulo")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-texto-suave">
          {t("subtitulo")}
        </p>
      </header>

      <Secao titulo={t("instalar.titulo")}>
        <ol className="space-y-6">
          <Passo numero={1}>
            <p>{t("instalar.passos.loja")}</p>
            {LOJA_DA_EXTENSAO === null ? (
              <>
                {/* Sem endereço ainda: botão morto, e o motivo escrito ao lado.
                    Link que não leva a lugar nenhum é pior que botão desligado. */}
                <span className="inline-flex cursor-not-allowed items-center rounded-md border border-borda px-4 py-2 text-sm font-bold text-texto-suave opacity-60">
                  {t("instalar.emBreve")}
                </span>
                <p className="text-xs">{t("instalar.aviso")}</p>
              </>
            ) : (
              <a
                href={LOJA_DA_EXTENSAO}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md bg-acento px-4 py-2 text-sm font-bold text-fundo"
              >
                {t("instalar.loja")}
              </a>
            )}
          </Passo>

          <Passo numero={2}>
            <p>{t("instalar.passos.entrar")}</p>
          </Passo>

          <Passo numero={3}>
            <p>{t("instalar.passos.abrir")}</p>
          </Passo>
        </ol>
      </Secao>

      <Secao titulo={t("usar.titulo")}>
        <p>{t("usar.obra")}</p>
        <p>{t("usar.capitulo")}</p>
        <Captura
          imagem={captura("popup-em-uso", idioma)}
          alt={t("usar.captura.alt")}
          legenda={t("usar.captura.legenda")}
        />
        {outroIdioma && <p className="text-xs">{t("capturaEmOutroIdioma")}</p>}
      </Secao>

      <Secao titulo={t("badge.titulo")}>
        <p>{t("badge.parear")}</p>
        <div className="flex flex-wrap gap-8 pt-2">
          <figure className="flex items-center gap-3">
            <Image
              src="/extensao/badge-pareada.png"
              alt={t("badge.pareada.alt")}
              width={48}
              height={50}
              className="rounded border border-borda"
            />
            <figcaption className="text-xs">{t("badge.pareada.legenda")}</figcaption>
          </figure>
          <figure className="flex items-center gap-3">
            <Image
              src="/extensao/badge-registrado.png"
              alt={t("badge.registrado.alt")}
              width={48}
              height={48}
              className="rounded border border-borda"
            />
            <figcaption className="text-xs">{t("badge.registrado.legenda")}</figcaption>
          </figure>
        </div>
      </Secao>

      <Secao titulo={t("automatico.titulo")}>
        <p>{t("automatico.oQueE")}</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>{t("automatico.condicoes.pareada")}</li>
          <li>{t("automatico.condicoes.espera")}</li>
          <li>{t("automatico.condicoes.foco")}</li>
        </ul>
        <p>{t("automatico.servidor")}</p>
      </Secao>

      <Secao titulo={t("privacidade.titulo")}>
        <p>{t("privacidade.oQueLe")}</p>
        <p>{t("privacidade.historico")}</p>
        <p>{t("privacidade.progresso")}</p>
      </Secao>

      <Secao titulo={t("problemas.titulo")}>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-texto">{t("problemas.sessao.titulo")}</h3>
            <p className="mt-1">{t("problemas.sessao.texto")}</p>
            <Captura
              imagem={captura("popup-sem-sessao", idioma)}
              alt={t("problemas.sessao.alt")}
              legenda={t("problemas.sessao.legenda")}
            />
          </div>

          <div>
            <h3 className="text-sm font-bold text-texto">{t("problemas.capitulo.titulo")}</h3>
            <p className="mt-1">{t("problemas.capitulo.texto")}</p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-texto">{t("problemas.foraDaEstante.titulo")}</h3>
            <p className="mt-1">
              {t.rich("problemas.foraDaEstante.texto", {
                catalogo: function (partes)
                {
                  return (
                    <Link href="/catalogo" className="text-acento underline underline-offset-4">
                      {partes}
                    </Link>
                  );
                },
              })}
            </p>
          </div>
        </div>
      </Secao>
    </main>
  );
}
