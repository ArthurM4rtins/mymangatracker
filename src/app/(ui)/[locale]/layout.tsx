import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Instrument_Sans, Zen_Kaku_Gothic_New } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { perfilDoUsuarioDoSistema } from "@/server/services/usuario.service";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { usuarioDaSessao } from "../../api/v1/_shared/sessao";
import { BotaoSair } from "./componentes/botao-sair";
import { BotaoVoltar } from "./componentes/botao-voltar";
import { Logo } from "./componentes/logo";
import { SeletorIdioma } from "./componentes/seletor-idioma";
import { SeletorTema } from "./componentes/seletor-tema";

const fonteUi = Instrument_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
});

const fonteMarca = Zen_Kaku_Gothic_New({
  variable: "--font-marca",
  weight: ["500", "700", "900"],
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  // `generateMetadata` roda antes do layout, entao a validacao do segmento
  // acontece de novo aqui: idioma desconhecido usa o titulo do padrao.
  const idioma = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: idioma, namespace: "meta" });

  return {
    title: {
      default: t("titulo"),
      template: `%s · ${t("titulo")}`,
    },
    description: t("descricao"),
  };
}

// Aplica o tema salvo antes do primeiro paint, senão a página pisca na cor do sistema.
const SCRIPT_TEMA = `(function () {
  try {
    var tema = localStorage.getItem("kidoku-tema");
    if (tema === "sumi" || tema === "noturno" || tema === "matcha") {
      document.documentElement.dataset.theme = tema;
    }
  } catch (e) {}
})();`;

function LinkDoHeader({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm text-texto-suave transition-colors hover:text-texto"
    >
      {children}
    </Link>
  );
}

/** O username de quem está logado, para o link do perfil. Banco fora = sem link. */
async function usernameDaSessao(userId: string): Promise<string | null>
{
  try
  {
    const perfil = await perfilDoUsuarioDoSistema(userId);

    return perfil?.username ?? null;
  }
  catch
  {
    return null;
  }
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  // `[locale]` pega qualquer rota desconhecida (`/favicon.png`, `/xx`): idioma
  // que não existe é 404, não um catálogo vazio.
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  // Resolver sessão aqui torna todas as rotas dinâmicas — aceito: as telas que
  // importam já são dinâmicas, e o header precisa saber se há alguém logado.
  const userId = await usuarioDaSessao();
  const username = userId === null ? null : await usernameDaSessao(userId);
  const t = await getTranslations("cabecalho");

  return (
    <html
      lang={locale}
      className={`${fonteUi.variable} ${fonteMarca.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        <NextIntlClientProvider>
          <header className="relative border-b border-borda">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <BotaoVoltar />
            </div>
            {/* Mesma largura da home (max-w-5xl): o logo alinha com o conteúdo. */}
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
              <Logo />
              <div className="flex items-center gap-4">
                <nav aria-label={t("navegacao")} className="flex items-center gap-3">
                  <LinkDoHeader href="/catalogo">{t("catalogo")}</LinkDoHeader>
                  <LinkDoHeader href="/listas">{t("listas")}</LinkDoHeader>
                  {userId && <LinkDoHeader href="/estante">{t("estante")}</LinkDoHeader>}
                  {username && <LinkDoHeader href={`/u/${username}`}>{t("perfil")}</LinkDoHeader>}
                </nav>

                <SeletorIdioma />
                <SeletorTema />

                {userId ? (
                  <BotaoSair />
                ) : (
                  <LinkDoHeader href="/entrar">{t("entrar")}</LinkDoHeader>
                )}
              </div>
            </div>
          </header>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
