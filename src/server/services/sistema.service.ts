/**
 * Fiacao do health: liga as sondas reais ao nucleo do `health.service`.
 *
 * Existe separado porque o controller nao pode importar repositorio nem infra —
 * a dependencia so aponta para baixo, e o `boundaries` cobra isso. Entao a
 * composicao mora aqui, na camada de servico, e o controller so chama uma funcao.
 *
 * O `health.service` continua sem saber o que e Postgres ou AniList, que e o que
 * mantem o teste dele rodando sem banco e sem rede.
 */
import { pingAniList } from "@/server/infra/anilist";
import { pingBanco } from "@/server/repositories/health.repository";
import { verificarSaude, type RelatorioSaude } from "./health.service";

export async function verificarSaudeDoSistema(): Promise<RelatorioSaude>
{
  return verificarSaude({
    database: pingBanco,
    anilist: pingAniList,
  });
}
