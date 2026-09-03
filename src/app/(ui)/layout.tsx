import type { Metadata } from "next";
import { Instrument_Sans, Zen_Kaku_Gothic_New } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { perfilDoUsuarioDoSistema } from "@/server/services/usuario.service";
import { usuarioDaSessao } from "../api/v1/_shared/sessao";
import { BotaoSair } from "./componentes/botao-sair";
import { BotaoVoltar } from "./componentes/botao-voltar";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Resolver sessão aqui torna todas as rotas dinâmicas — aceito: as telas que
  // importam já são dinâmicas, e o header precisa saber se há alguém logado.
  const userId = await usuarioDaSessao();
  const username = userId === null ? null : await usernameDaSessao(userId);

  return (
    <html
      lang="pt-BR"
      className={`${fonteUi.variable} ${fonteMarca.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        <header className="relative border-b border-borda">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <BotaoVoltar />
          </div>
          {/* Mesma largura da home (max-w-5xl): o logo alinha com o conteúdo. */}
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
            <Logo />
            <div className="flex items-center gap-4">
              <nav aria-label="Navegação" className="flex items-center gap-3">
                <LinkDoHeader href="/catalogo">Catálogo</LinkDoHeader>
                <LinkDoHeader href="/listas">Listas</LinkDoHeader>
                {userId && <LinkDoHeader href="/estante">Estante</LinkDoHeader>}
                {username && <LinkDoHeader href={`/u/${username}`}>Perfil</LinkDoHeader>}
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
