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
/**
 * A falha vale por uma janela própria e curta (#148, item 11). Antes o memo era
 * limpo no erro, então durante uma indisponibilidade do AniList ele ficava
 * desligado e cada chamada virava uma requisição nova — mantendo a cota fixada
 * em zero justo quando ela precisava se recuperar.
 */
const JANELA_DE_FALHA_MS = 10_000;
const pingAniListLembrado = lembrarPorTempo(
  pingAniList,
  JANELA_DO_ANILIST_MS,
  undefined,
  JANELA_DE_FALHA_MS,
);

async function sondaDoSegredo(): Promise<"ok" | "not_configured">
{
  return sessaoConfigurada() ? "ok" : "not_configured";
}

/**
 * `completo` só para quem está autenticado (#148, itens 11 e 12): a sonda do
 * terceiro e a lista de dependências saem do corpo anônimo. Sem sessão, o health
 * responde liveness do que é nosso — banco e segredo —, que é barato e não
 * publica estado de configuração para qualquer um.
 */
export async function verificarSaudeDoSistema(
  opcoes: { completo?: boolean } = {},
): Promise<RelatorioSaude>
{
  return verificarSaude({
    database: pingBanco,
    anilist: opcoes.completo === true ? pingAniListLembrado : undefined,
    sessionSecret: sondaDoSegredo,
  });
}
