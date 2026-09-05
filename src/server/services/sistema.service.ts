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
import { lembrarPorTempo } from "@/server/domain/memoria-curta";
import { pingAniList } from "@/server/infra/anilist";
import { sessaoConfigurada } from "@/server/infra/config";
import { pingBanco } from "@/server/repositories/health.repository";
import { verificarSaude, type RelatorioSaude } from "./health.service";

/**
 * A rota é pública e sem cache; sem isto cada chamada era uma requisição real
 * ao AniList pela cota compartilhada de todo o app (#65, item 26). O banco não
 * entra na memória: é nosso e a sonda é barata.
 */
const JANELA_DO_ANILIST_MS = 30_000;
const pingAniListLembrado = lembrarPorTempo(pingAniList, JANELA_DO_ANILIST_MS);

async function sondaDoSegredo(): Promise<"ok" | "not_configured">
{
  return sessaoConfigurada() ? "ok" : "not_configured";
}

export async function verificarSaudeDoSistema(): Promise<RelatorioSaude>
{
  return verificarSaude({
    database: pingBanco,
    anilist: pingAniListLembrado,
    sessionSecret: sondaDoSegredo,
  });
}
