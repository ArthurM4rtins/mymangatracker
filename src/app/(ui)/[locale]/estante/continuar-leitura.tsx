/**
 * O link que leva de volta para onde a pessoa parou.
 *
 * O destino é a última abertura registrada pela extensão (#170). Antes disso a
 * tela usava a fonte configurada à mão, que ficava congelada no momento do
 * cadastro: quem estava no capítulo 94 voltava para o 2. Uma verdade só, e ela
 * é a que a extensão atualiza a cada registro.
 *
 * Sem abertura nenhuma não há destino, e a tela diz isso em vez de esconder o
 * motivo num botão desabilitado.
 */
import { useTranslations } from "next-intl";

export function ContinuarLeitura({
  continuarEm,
  compacto = false,
}: {
  continuarEm: { url: string; host: string; capitulo: string } | null;
  /** Na home o card é pequeno: sem a linha de ajuda. */
  compacto?: boolean;
})
{
  const t = useTranslations("estante");

  if (continuarEm === null)
  {
    return compacto ? null : (
      <p className="text-xs text-texto-suave">{t("continuar.semLeitura")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <a
        href={continuarEm.url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-fit rounded-md bg-acento px-3 py-1.5 text-sm font-medium text-acento-contraste"
      >
        {t("continuar.continuar")}
      </a>

      {!compacto && (
        <span className="text-xs text-texto-suave">
          {t("continuar.capituloEm", {
            capitulo: continuarEm.capitulo,
            host: continuarEm.host,
          })}
        </span>
      )}
    </div>
  );
}
