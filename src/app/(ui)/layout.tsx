import type { Metadata } from "next";
import { Instrument_Sans, Zen_Kaku_Gothic_New } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { usuarioDaSessao } from "../api/v1/_shared/sessao";
import { BotaoSair } from "./componentes/botao-sair";
import { Logo } from "./componentes/logo";
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

export const metadata: Metadata = {
  title: {
    default: "Kidoku",
    template: "%s · Kidoku",
  },
  description:
    "Um Letterboxd para mangá, manhwa e novel, com progresso de leitura automático e privado.",
};

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Resolver sessão aqui torna todas as rotas dinâmicas — aceito: as telas que
  // importam já são dinâmicas, e o header precisa saber se há alguém logado.
  const userId = await usuarioDaSessao();

  return (
    <html
      lang="pt-BR"
      className={`${fonteUi.variable} ${fonteMarca.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        <header className="border-b border-borda">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
            <Logo />
            <div className="flex items-center gap-4">
              <nav aria-label="Navegação" className="flex items-center gap-3">
                <LinkDoHeader href="/catalogo">Catálogo</LinkDoHeader>
                <LinkDoHeader href="/listas">Listas</LinkDoHeader>
                {userId && <LinkDoHeader href="/estante">Estante</LinkDoHeader>}
              </nav>

              <SeletorTema />

              {userId ? (
                <BotaoSair />
              ) : (
                <LinkDoHeader href="/entrar">Entrar</LinkDoHeader>
              )}
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
