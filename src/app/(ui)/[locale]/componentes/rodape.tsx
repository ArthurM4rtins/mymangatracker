import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { FonteDosDados } from "./fonte-dos-dados";
import { LinkDeRelato } from "./link-de-relato";

/**
 * O rodapé global (#248).
 *
 * Antes era uma linha só, com o link de relatar erro de tradução (#158) e nada
 * mais. Duas faltas doíam: ninguém tinha caminho de volta para o catálogo sem
 * subir até o cabeçalho, e **nada no site creditava o AniList nem o Kitsu** —
 * as únicas menções viviam em mensagem de erro, que só aparece quando a fonte
 * cai. As duas APIs esperam atribuição, e rodapé é o lugar dela.
 *
 * Só entram telas que existem. Sobre, Termos e Privacidade ficaram para a #249,
 * porque exigem páginas novas com texto de verdade; linkar antes seria link
 * morto.
 */
export async function Rodape({
  logado,
  username,
}: {
  logado: boolean;
  username: string | null;
})
{
  const t = await getTranslations("rodape");
  const c = await getTranslations("cabecalho");
  const meta = await getTranslations("meta");

  return (
    <footer className="mt-16 border-t border-borda">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <p className="font-marca text-base font-bold tracking-tight">
            {meta("titulo")}
            <span aria-hidden className="ml-1.5 text-[0.6rem] font-bold text-acento">
              葉宙
            </span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-texto-suave">
            {meta("descricao")}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-12 gap-y-8">
          <Coluna titulo={t("explorar.titulo")}>
            <ItemDoRodape href="/catalogo">{c("catalogo")}</ItemDoRodape>
            <ItemDoRodape href="/listas">{c("listas")}</ItemDoRodape>
          </Coluna>

          <Coluna titulo={t("conta.titulo")}>
            {logado ? (
              <>
                <ItemDoRodape href="/estante">{c("estante")}</ItemDoRodape>
                {username && (
                  <ItemDoRodape href={`/u/${username}`}>{c("perfil")}</ItemDoRodape>
                )}
                <ItemDoRodape href="/conta">{t("conta.ajustes")}</ItemDoRodape>
              </>
            ) : (
              <>
                <ItemDoRodape href="/entrar">{c("entrar")}</ItemDoRodape>
                <ItemDoRodape href="/cadastrar">{t("conta.cadastrar")}</ItemDoRodape>
              </>
            )}
          </Coluna>

          {/* O crédito das fontes, que é o motivo de peso deste rodapé existir. */}
          <Coluna titulo={t("dados.titulo")}>
            <li className="max-w-[16rem] leading-relaxed">{t("dados.anilist")}</li>
            <li className="max-w-[16rem] leading-relaxed">{t("dados.kitsu")}</li>
            {/* De qual fonte esta vindo AGORA. So para quem esta logado: a #148
                decidiu nao publicar estado de dependencia para anonimo. */}
            {logado && <FonteDosDados />}
          </Coluna>
        </div>
      </div>

      <div className="border-t border-borda">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-texto-suave">
          {/* Ano fixo, não `new Date()`: a data do servidor faria a marcação do
              servidor e a do cliente divergirem na virada do ano, e o valor não
              vale um render dinâmico. */}
          <p>{t("direitos", { ano: 2026 })}</p>
          <LinkDeRelato />
        </div>
      </div>
    </footer>
  );
}

function Coluna({ titulo, children }: { titulo: string; children: React.ReactNode })
{
  return (
    <nav aria-label={titulo}>
      <p className="text-[0.7rem] uppercase tracking-wide text-texto-suave">{titulo}</p>
      <ul className="mt-3 flex flex-col gap-2 text-xs text-texto-suave">{children}</ul>
    </nav>
  );
}

function ItemDoRodape({ href, children }: { href: string; children: React.ReactNode })
{
  return (
    <li>
      <Link href={href} className="transition-colors hover:text-texto">
        {children}
      </Link>
    </li>
  );
}
